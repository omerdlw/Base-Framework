import {
  isValidElement,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  clamp,
  cn,
  formatMediaTime,
  isImageIconSource,
  isObject,
  isObject as isObjectLike,
  isPlainObject,
  isValidBannerUrl,
  normalizePath,
  shallowEqual as areShallowCollectionsEqual,
  toArray,
} from "@/core/utils";
import {
  NAV_ACTION_STYLES,
  SEMANTIC_SURFACE_CLASSES,
  NAVIGATION_FOCUSABLE_SELECTOR,
  NAVIGATION_FOCUS_RESTORE_BLOCKED_REASONS,
} from "./constants";

export {
  areShallowCollectionsEqual,
  clamp,
  formatMediaTime,
  isImageIconSource,
  isObject,
  isObjectLike,
  isPlainObject,
  isValidBannerUrl,
  normalizePath,
  toArray,
};

export function toObject(value: any): Record<string, any> {
  return isObjectLike(value) ? value : {};
}

export function isValidComponentType(type: any): boolean {
  if (typeof type === "function") return true;
  return Boolean(
    type != null &&
    typeof type === "object" &&
    !isValidElement(type) &&
    "$$typeof" in type,
  );
}

export function resolveComponentType(
  ...candidates: any[]
): ComponentType<any> | null {
  return candidates.find(isValidComponentType) ?? null;
}

export function resolveRenderableContent(
  ...candidates: any[]
): ReactNode | null {
  return (
    candidates.find(
      (candidate) => candidate !== null && candidate !== undefined,
    ) ?? null
  );
}

export function collectSearchableText(
  value: any,
  visitedObjects: WeakSet<any>,
): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value)) {
    if (visitedObjects.has(value)) return "";
    visitedObjects.add(value);
    const text = value
      .map((entry) => collectSearchableText(entry, visitedObjects))
      .join(" ");
    visitedObjects.delete(value);
    return text;
  }
  if (isValidElement(value)) {
    if (visitedObjects.has(value)) return "";
    visitedObjects.add(value);
    const text = collectSearchableText(
      (value.props as any)?.children,
      visitedObjects,
    );
    visitedObjects.delete(value);
    return text;
  }
  if (value && typeof value === "object") {
    if (visitedObjects.has(value)) return "";
    visitedObjects.add(value);
    return Object.values(value)
      .map((entry) => collectSearchableText(entry, visitedObjects))
      .join(" ");
  }
  return "";
}

export function toSearchableText(value: any): string {
  return collectSearchableText(value, new WeakSet());
}

export function isSamePath(left: any, right: any): boolean {
  const normalizedLeft = normalizePath(left);
  const normalizedRight = normalizePath(right);
  return Boolean(
    normalizedLeft && normalizedRight && normalizedLeft === normalizedRight,
  );
}

export const isEqualRoutePath = isSamePath;

export function isPathPrefix(candidatePath: any, pathname: any): boolean {
  const normalizedCandidate = normalizePath(candidatePath);
  const normalizedPathname = normalizePath(pathname);
  if (!normalizedCandidate || !normalizedPathname) return false;
  if (normalizedCandidate === normalizedPathname) return true;
  if (normalizedCandidate === "/") return normalizedPathname.startsWith("/");
  return normalizedPathname.startsWith(`${normalizedCandidate}/`);
}

export function isInlineActionPathMatch(path: any, pathname: any): boolean {
  return (
    isSamePath(path, pathname) || (path !== "/" && isPathPrefix(path, pathname))
  );
}

export function isSafeInternalHref(value: any): boolean {
  const href = typeof value === "string" ? value.trim() : "";
  return href.startsWith("/") && !href.startsWith("//");
}

export function isSameNavItem(item: any, candidate: any): boolean {
  return (
    (item?.path && item.path === candidate?.path) ||
    (item?.name && item.name === candidate?.name)
  );
}

export const isSameItem = isSameNavItem;

export function getNavigationLocationKey({
  hash = "",
  pathname = "/",
  search = "",
}: {
  hash?: string;
  pathname?: string;
  search?: string;
} = {}): string {
  const normalizedPathname = String(pathname || "/").trim() || "/";
  const normalizedSearch = String(search || "").trim();
  const normalizedHash = String(hash || "").trim();
  const query = normalizedSearch
    ? normalizedSearch.startsWith("?")
      ? normalizedSearch
      : `?${normalizedSearch}`
    : "";
  const fragment = normalizedHash
    ? normalizedHash.startsWith("#")
      ? normalizedHash
      : `#${normalizedHash}`
    : "";
  return `${normalizedPathname}${query}${fragment}`;
}

export function blurActiveElement(): void {
  if (typeof document === "undefined") return;
  const activeElement = document.activeElement as HTMLElement | null;
  if (activeElement && typeof activeElement.blur === "function") {
    activeElement.blur();
  }
}

export function getScrollableHeight(): number {
  if (typeof document === "undefined") return 0;
  const { body, documentElement } = document;
  return Math.max(
    body ? body.scrollHeight : 0,
    documentElement ? documentElement.scrollHeight : 0,
  );
}

export function getDistanceToBottom(
  scrollPosition: number | null = null,
): number {
  if (typeof window === "undefined") return Number.POSITIVE_INFINITY;
  const scrollableHeight = getScrollableHeight();
  const viewportHeight = window.innerHeight;
  const currentScroll =
    scrollPosition !== null ? scrollPosition : window.scrollY;
  return Math.max(0, scrollableHeight - (currentScroll + viewportHeight));
}

export function isInteractiveTarget(target: any): boolean {
  return Boolean(
    target &&
    target.closest &&
    target.closest(
      'button, a, input, textarea, select, [role="button"], [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function isEditableNavigationTarget(target: any): boolean {
  return Boolean(
    target &&
    target.closest &&
    target.closest('input, textarea, select, [contenteditable="true"]'),
  );
}

export function getNavigationFocusableElements(
  container: HTMLElement | null,
): HTMLElement[] {
  if (!container || typeof container.querySelectorAll !== "function") return [];
  return (
    Array.from(
      container.querySelectorAll(NAVIGATION_FOCUSABLE_SELECTOR),
    ) as HTMLElement[]
  ).filter((element) => {
    if (!element || element.getAttribute("aria-hidden") === "true")
      return false;
    const style =
      typeof window !== "undefined" ? window.getComputedStyle(element) : null;
    return (
      style?.display !== "none" &&
      style?.visibility !== "hidden" &&
      style?.pointerEvents !== "none"
    );
  });
}

export function focusNavigationElement(element: HTMLElement | null): boolean {
  if (!element || typeof element.focus !== "function") return false;
  try {
    element.focus({ preventScroll: true });
    return document.activeElement === element;
  } catch {
    return false;
  }
}

export function shouldRestoreNavigationFocus(result: any): boolean {
  return (
    !result ||
    !(NAVIGATION_FOCUS_RESTORE_BLOCKED_REASONS as readonly string[]).includes(
      result.blockedReason,
    )
  );
}

export function normalizeUpper(value: any): string {
  return String(value || "")
    .trim()
    .toUpperCase();
}

export function normalizeLower(value: any): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function splitStyle(style: Record<string, any> = {}): {
  className: string | undefined;
  inlineStyle: CSSProperties & Record<string, any>;
} {
  const { className, ...inlineStyle } = style;
  return {
    className,
    inlineStyle,
  };
}

export function getLineClampStyle(
  maxLines: number | string | undefined,
  style: Record<string, any>,
): Record<string, any> {
  if (Number(maxLines) <= 1) return style;
  return {
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: maxLines,
    display: "-webkit-box",
    overflow: "hidden",
    ...style,
  };
}

export function getImageIconStyle(
  style: Record<string, any>,
  icon: string,
): Record<string, any> {
  const nextStyle = {
    ...style,
  };
  delete nextStyle.background;
  delete nextStyle.backgroundImage;
  return {
    ...nextStyle,
    backgroundImage: `url(${icon})`,
  };
}

export function getNavActionClass({
  className = "",
  button = "",
  isActive = false,
  variant = "",
  tone = "",
  base,
  cn: classNamesFn,
}: {
  className?: string;
  button?: string;
  isActive?: boolean;
  variant?: string;
  tone?: string;
  base?: string;
  cn?: (...args: any[]) => string;
} = {}): string {
  const resolve = classNamesFn || cn;
  if (button && !className && base === undefined) {
    if (tone) {
      const toneClass =
        (NAV_ACTION_STYLES.action as any)[tone] ||
        (SEMANTIC_SURFACE_CLASSES as any)[tone]?.surface ||
        NAV_ACTION_STYLES.action.muted;
      return resolve(button, toneClass);
    }
    const stateToken = isActive
      ? NAV_ACTION_STYLES.action.active
      : NAV_ACTION_STYLES.action.muted;
    return resolve(button, stateToken);
  }
  const elementClass = className || button;
  const resolvedBase = base !== undefined ? base : NAV_ACTION_STYLES.base;
  const stateClass =
    variant ||
    (tone &&
      ((SEMANTIC_SURFACE_CLASSES as any)[tone]?.surface ||
        (NAV_ACTION_STYLES.action as any)[tone])) ||
    (isActive ? NAV_ACTION_STYLES.active : NAV_ACTION_STYLES.muted);
  return resolve(stateClass, resolvedBase, elementClass);
}

export function isHudDescriptor(value: any): boolean {
  return (
    isObjectLike(value) &&
    !isValidElement(value) &&
    ("component" in value ||
      "content" in value ||
      "node" in value ||
      "element" in value ||
      "isActive" in value ||
      "id" in value)
  );
}

export function isSurfaceDescriptor(value: any): boolean {
  return (
    value != null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !isValidElement(value)
  );
}

export function getItemKey(link: any, index = 0): string {
  const identity = link?.id ?? link?.path ?? link?.name ?? link?.type;
  return `nav-card:${identity == null ? `slot-${index}` : String(identity)}`;
}

export function getItemMeasurementKey({
  link,
  expanded,
  compact,
  isHud = false,
}: {
  link: any;
  expanded: boolean;
  compact: boolean;
  isHud?: boolean;
  isHovered?: boolean;
  isStackHovered?: boolean;
}): string {
  const state = isHud
    ? "hud"
    : link.isLoading
      ? "loading"
      : link.isSurface
        ? "surface"
        : "standard";
  return `${link.path || link.name || "item"}:${state}:${expanded ? "expanded" : "collapsed"}:${compact ? "compact" : "full"}`;
}

export function getRouteMeasurementKey(
  pathname: string | null,
  key: string,
): string {
  return `${pathname || ""}:${key}`;
}

export function resolveNavHeaderKey({
  link,
  description = "",
  showVideoIcon = false,
}: {
  link: any;
  description?: string | null;
  showVideoIcon?: boolean;
}): string {
  const statusPart = link?.isStatus
    ? `status:${link.statusType || link.type || "status"}`
    : "standard";
  const identityPart = link?.path || link?.name || link?.id || "item";
  const titlePart = link?.title || link?.name || "";
  const descPart = description || "";
  const iconPart = showVideoIcon ? "video" : link?.icon || "no-icon";
  return `${statusPart}:${identityPart}:${iconPart}:${titlePart}:${descPart}`;
}

let generatedExtensionId = 0;

export function normalizeSurfaceExtension(input: any): any {
  if (!input) return null;
  if (isValidElement(input)) {
    return {
      align: "left",
      className: "",
      component: null,
      content: input,
      id: `ext-${++generatedExtensionId}`,
      order: 0,
      props: {},
      unstyled: false,
    };
  }
  if (typeof input !== "object") return null;

  const component = isValidComponentType(input.component)
    ? input.component
    : null;
  const content =
    isValidElement(input.content) ||
    typeof input.content === "string" ||
    typeof input.content === "number"
      ? input.content
      : null;

  if (!component && content == null) return null;

  const align =
    input.align === "right" || input.align === "end"
      ? "right"
      : input.align === "center"
        ? "center"
        : "left";

  return {
    align,
    className: typeof input.className === "string" ? input.className : "",
    component,
    content,
    id: String(input.id || input.key || `ext-${++generatedExtensionId}`),
    order: Number.isFinite(Number(input.order)) ? Number(input.order) : 0,
    props: isPlainObject(input.props) ? input.props : {},
    unstyled: Boolean(input.unstyled),
  };
}

export function normalizeSurfaceFlowSnapshot(value: any): any {
  if (!isPlainObject(value)) return null;
  return { ...value };
}

export function createSurfaceReturnHandshake(input: any): any {
  const source = typeof input === "string" ? { pathname: input } : input;
  const pathname =
    typeof source?.pathname === "string" ? source.pathname.trim() : "";

  if (!isSafeInternalHref(pathname)) return null;

  return {
    focusKey:
      typeof source.focusKey === "string" && source.focusKey.trim()
        ? source.focusKey.trim()
        : null,
    pathname,
    restoreScroll: source.restoreScroll !== false,
    returnOnCancel: source.returnOnCancel === true,
  };
}

export function resolveSurfaceFlowReturnHandshake(
  definition: any,
  input: any,
): any {
  const inputHandshake =
    input?.returnHandshake ??
    (input?.returnTo
      ? {
          focusKey: input.returnFocusKey,
          pathname: input.returnTo,
          restoreScroll: input.restoreReturnScroll,
          returnOnCancel: input.returnOnCancel,
        }
      : null);
  const baseHandshake = definition?.returnHandshake;

  if (!baseHandshake && !inputHandshake) return null;
  return createSurfaceReturnHandshake({ ...baseHandshake, ...inputHandshake });
}
