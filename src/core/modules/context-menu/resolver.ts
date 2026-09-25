import {
  CURRENT_PAGE_KEY,
  GLOBAL_MENU_KEY,
  MENU_SCREEN_MARGIN,
  CONTEXT_MENU_LAYOUT,
} from "./constants";
import {
  isObject,
  toArray,
  resolveAsBoolean,
  resolveAsValue,
  extractNodeText,
} from "./utils";
import type {
  ContextMenuCandidate,
  ContextMenuConfig,
  ContextMenuContextValue,
  ContextMenuMetrics,
  ContextMenuPosition,
  ContextMenuResolvedHeader,
  ContextMenuResolvedItem,
  ContextMenuResolvedMatch,
} from "./types";

function normalizeMenuCandidates(
  registryMenus?: Record<string, any> | null,
): ContextMenuCandidate[] {
  const candidates: ContextMenuCandidate[] = [];
  let order = 0;

  for (const [registryKey, rawConfig] of Object.entries(registryMenus || {})) {
    if (!isObject(rawConfig)) continue;

    const { menus, ...sharedConfig } = rawConfig;
    const sharedClassNames = sharedConfig.classNames || {};
    const hasSharedItems =
      Array.isArray(sharedConfig.items) ||
      typeof sharedConfig.items === "function";
    const nestedMenus = toArray(menus).filter(isObject);

    if (hasSharedItems || nestedMenus.length === 0) {
      candidates.push({ registryKey, config: sharedConfig, order: order++ });
    }

    for (const menu of nestedMenus) {
      candidates.push({
        registryKey,
        config: {
          ...sharedConfig,
          ...menu,
          classNames: { ...sharedClassNames, ...(menu.classNames || {}) },
        },
        order: order++,
      });
    }
  }
  return candidates;
}

function isPathAllowed(
  config: ContextMenuConfig,
  registryKey: string,
  pathname?: string,
): boolean {
  if (!pathname) return true;
  if (typeof config.path === "string" && config.path === pathname) return true;

  const explicitPaths = toArray(config.paths || config.pathnames).filter(
    (p): p is string => typeof p === "string" && Boolean(p),
  );
  if (explicitPaths.length > 0) return explicitPaths.includes(pathname);

  if (typeof config.pathMatcher === "function") {
    try {
      return Boolean(config.pathMatcher(pathname));
    } catch {
      return false;
    }
  }

  return (
    registryKey === pathname ||
    registryKey === CURRENT_PAGE_KEY ||
    registryKey === GLOBAL_MENU_KEY
  );
}

function getMatchDepth(
  sourceElement: Element | null,
  matchedElement: Element | null,
): number {
  let depth = 0;
  let node: Element | null = sourceElement;
  while (node && node !== matchedElement) {
    node = node.parentElement;
    depth += 1;
  }
  return depth;
}

function getTargetScore(
  config: ContextMenuConfig,
  targetElement: Element | null,
): number | null {
  const selectors = toArray(config.target).filter(
    (s): s is string => typeof s === "string" && Boolean(s.trim()),
  );
  if (selectors.length === 0) return 0;
  if (!targetElement) return null;

  let minDepth = Infinity;
  for (const selector of selectors) {
    try {
      const matchedElement = targetElement.closest(selector);
      if (matchedElement) {
        minDepth = Math.min(
          minDepth,
          getMatchDepth(targetElement, matchedElement),
        );
      }
    } catch {}
  }
  return minDepth === Infinity ? null : Math.max(0, 100 - minDepth);
}

function getRouteScore(
  config: ContextMenuConfig,
  registryKey: string,
  pathname?: string,
): number {
  if (!pathname) return 0;
  if (
    config.path === pathname ||
    toArray(config.paths || config.pathnames).includes(pathname) ||
    registryKey === pathname
  )
    return 100;
  if (registryKey === CURRENT_PAGE_KEY) return 70;
  if (registryKey === GLOBAL_MENU_KEY) return 40;
  return 10;
}

function buildMenuContext(
  config: ContextMenuConfig,
  event: any,
  pathname?: string,
  targetElement?: Element | null,
): ContextMenuContextValue {
  let context: ContextMenuContextValue = {
    currentTarget: event?.currentTarget ?? null,
    event,
    pathname: pathname || "",
    point: {
      x: Number(event?.clientX) || 0,
      y: Number(event?.clientY) || 0,
    },
    target: targetElement,
  };

  if (config.payload !== undefined) context.payload = config.payload;

  if (typeof config.resolvePayload === "function") {
    try {
      const resolved = config.resolvePayload(event, context);
      if (resolved !== undefined) context.payload = resolved;
    } catch {}
  }

  if (typeof config.resolveContext === "function") {
    try {
      const extraContext = config.resolveContext(event, context);
      if (isObject(extraContext)) context = { ...context, ...extraContext };
    } catch {}
  }
  return context;
}

export function resolveMenuItems(
  config: ContextMenuConfig | null | undefined,
  context: ContextMenuContextValue,
): ContextMenuResolvedItem[] {
  const rawItems =
    typeof config?.items === "function"
      ? resolveAsValue(config.items, context, [])
      : config?.items;

  const items = toArray(rawItems)
    .map((item, index) => {
      if (!item) return null;
      if (item === "separator") {
        return {
          key: `separator-${index}`,
          type: "separator" as const,
        };
      }
      if (typeof item === "object" && item.type === "separator") {
        return {
          ...item,
          key: item.key || `separator-${index}`,
          type: "separator" as const,
        };
      }
      if (!isObject(item)) return null;

      if (
        resolveAsBoolean(item.hidden, context, false) ||
        !resolveAsBoolean(item.visible, context, true)
      )
        return null;

      const labelValue = resolveAsValue(item.label, context, "");
      const label =
        typeof labelValue === "string" || typeof labelValue === "number"
          ? String(labelValue)
          : "";
      if (!label.trim()) return null;

      const handler =
        typeof item.onSelect === "function"
          ? item.onSelect
          : typeof item.onClick === "function"
            ? item.onClick
            : null;
      const shortcut = resolveAsValue(item.shortcut, context, null);

      return {
        ...item,
        closeOnSelect: item.closeOnSelect !== false,
        danger: resolveAsBoolean(item.danger, context, false),
        disabled: resolveAsBoolean(item.disabled, context, false),
        icon: resolveAsValue(item.icon, context, null) || null,
        itemIconClassName:
          resolveAsValue(item.itemIconClassName, context, "") || "",
        key: item.key || `item-${index}`,
        label,
        onClick: handler,
        onSelect: handler,
        shortcut: typeof shortcut === "string" ? shortcut : null,
        className: resolveAsValue(item.className, context, "") || "",
        type: "action" as const,
      };
    })
    .filter(Boolean) as ContextMenuResolvedItem[];

  const compacted: ContextMenuResolvedItem[] = [];
  for (const item of items) {
    if (
      item.type === "separator" &&
      (!compacted.length ||
        compacted[compacted.length - 1].type === "separator")
    )
      continue;
    compacted.push(item);
  }
  if (compacted.length && compacted[compacted.length - 1].type === "separator")
    compacted.pop();

  return compacted;
}

function isMenuOverlayTarget(element: Element | null): boolean {
  return Boolean(
    element?.closest?.("[data-context-menu-ignore]") ||
    element?.closest?.("[data-context-menu-overlay]") ||
    element?.closest?.('[role="menu"]') ||
    element?.classList?.contains("context-menu-overlay"),
  );
}

function resolveEventTarget(event: any): Element | null {
  if (!event) return null;
  const isEl =
    typeof Element !== "undefined" &&
    (event.target instanceof Element || event.target instanceof SVGElement);
  const initialTarget = isEl ? (event.target as Element) : null;

  if (
    typeof document === "undefined" ||
    !Number.isFinite(event.clientX) ||
    !Number.isFinite(event.clientY)
  )
    return initialTarget;

  if (!initialTarget || isMenuOverlayTarget(initialTarget)) {
    try {
      const elements = document.elementsFromPoint(event.clientX, event.clientY);
      const validTarget = elements.find((el) => !isMenuOverlayTarget(el));
      return validTarget || initialTarget;
    } catch {
      return initialTarget;
    }
  }
  return initialTarget;
}

export function resolveContextMenu(
  registryMenus: Record<string, any> | null | undefined,
  pathname?: string,
  event?: any,
): ContextMenuResolvedMatch | null {
  const candidates = normalizeMenuCandidates(registryMenus);
  const targetElement = resolveEventTarget(event);
  let winner: ContextMenuResolvedMatch | null = null;

  for (const candidate of candidates) {
    const { config, registryKey, order } = candidate;
    if (!isObject(config) || !isPathAllowed(config, registryKey, pathname))
      continue;

    const context = buildMenuContext(config, event, pathname, targetElement);
    if (!resolveAsBoolean(config.enabled, context, true)) continue;

    if (typeof config.when === "function") {
      try {
        if (
          !config.when(event, {
            pathname: pathname || "",
            target: targetElement,
            context,
          })
        )
          continue;
      } catch {
        continue;
      }
    } else if (config.when === false) {
      continue;
    }

    const items = resolveMenuItems(config, context);
    if (!items.length) continue;

    const targetScore = getTargetScore(config, targetElement);
    if (targetScore === null) continue;

    const score =
      (Number.isFinite(Number(config.priority)) ? Number(config.priority) : 0) *
        10000 +
      getRouteScore(config, registryKey, pathname) * 100 +
      targetScore;

    if (
      !winner ||
      score > winner.score ||
      (score === winner.score && order < winner.order)
    ) {
      winner = { config, context, items, score, order };
    }
  }
  return winner;
}

export function getContextMenuMetrics(): ContextMenuMetrics {
  return {
    headerIconRadius: 14,
    itemRadius: 12,
    wrapperPadding: CONTEXT_MENU_LAYOUT.wrapperPadding,
    wrapperRadius: CONTEXT_MENU_LAYOUT.wrapperRadius,
  };
}

export function resolveMenuHeader(
  config: ContextMenuConfig | null | undefined,
  menuContext: ContextMenuContextValue,
): ContextMenuResolvedHeader | null {
  if (config?.header === false || config?.showPageHeader === false) return null;

  const headerSource = isObject(
    resolveAsValue(config?.header, menuContext, null),
  )
    ? resolveAsValue(config?.header, menuContext, null)
    : isObject(menuContext?.page)
      ? menuContext.page
      : null;
  if (!headerSource) return null;

  const title = resolveAsValue(headerSource.title, menuContext, null);
  const description = resolveAsValue(
    headerSource.description,
    menuContext,
    null,
  );
  const icon = resolveAsValue(headerSource.icon, menuContext, null);
  const eyebrow = resolveAsValue(headerSource.eyebrow, menuContext, null);

  if (!title && !description && !icon && !eyebrow) return null;

  return {
    description,
    descriptionText: extractNodeText(description),
    eyebrow,
    icon,
    title,
    titleText: extractNodeText(title),
  };
}

export function positionMenu(
  menuElement: HTMLElement | null,
  position?: ContextMenuPosition | null,
): void {
  if (!menuElement) return;
  const rect = menuElement.getBoundingClientRect();
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  let x = Number(position?.x) || 0;
  let y = Number(position?.y) || 0;

  if (x + rect.width > viewportW - MENU_SCREEN_MARGIN)
    x = viewportW - rect.width - MENU_SCREEN_MARGIN;
  if (y + rect.height > viewportH - MENU_SCREEN_MARGIN)
    y = viewportH - rect.height - MENU_SCREEN_MARGIN;

  menuElement.style.left = `${Math.round(Math.max(MENU_SCREEN_MARGIN, x))}px`;
  menuElement.style.top = `${Math.round(Math.max(MENU_SCREEN_MARGIN, y))}px`;
}
