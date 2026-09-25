"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Z_INDEX } from "@/core/tokens";
import { Icon } from "@/core/primitives";
import {
  CONTEXT_MENU_ITEM_TAP,
  CONTEXT_MENU_MICRO_SPRING,
  menuContentVariants,
  menuItemVariants,
  menuPopVariants,
} from "./motion";
import {
  isImageIconSource,
  isObject,
  isScrollLockKey,
  joinClassNames,
} from "./utils";
import {
  getContextMenuMetrics,
  positionMenu,
  resolveMenuHeader,
  resolveMenuItems,
} from "./resolver";
import { useContextMenu, useContextMenuListener } from "./provider";
import type {
  ContextMenuClassNames,
  ContextMenuConfig,
  ContextMenuPosition,
  ContextMenuResolvedHeader,
  ContextMenuResolvedItem,
} from "./types";

const IconComponent = Icon as any;
const emptySubscribe = () => () => {};

export function ContextMenuHeaderIcon({
  classNames = {},
  icon,
}: {
  classNames?: ContextMenuClassNames;
  icon: any;
}) {
  const iconClassName = joinClassNames(
    "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[14px] ring-1 ring-inset ring-white/10 bg-white/5 bg-cover bg-center bg-no-repeat text-white/70",
    classNames.headerIcon,
  );

  if (isImageIconSource(icon)) {
    return (
      <div
        className={iconClassName}
        style={{ backgroundImage: `url(${icon})` }}
      />
    );
  }
  return (
    <div className={iconClassName}>
      {typeof icon === "string" ? (
        <IconComponent icon={icon} size={20} />
      ) : (
        icon
      )}
    </div>
  );
}

export function ContextMenuHeader({
  classNames = {},
  header,
}: {
  classNames?: ContextMenuClassNames;
  header: ContextMenuResolvedHeader | null;
}) {
  if (!header) return null;

  return (
    <div
      className={joinClassNames(
        "mb-2 flex items-center gap-2.5 border-b border-white/10 px-1 pb-2.5",
        classNames.header,
      )}
    >
      {header.icon && (
        <ContextMenuHeaderIcon classNames={classNames} icon={header.icon} />
      )}
      <div className="h-full w-full min-w-0 space-y-0.5">
        {header.eyebrow && (
          <div
            className={joinClassNames(
              "text-xs font-semibold text-white/50 uppercase",
              classNames.headerEyebrow,
            )}
          >
            {header.eyebrow}
          </div>
        )}
        {header.title && (
          <div
            className={joinClassNames(
              "truncate text-sm leading-tight font-semibold text-white",
              classNames.headerTitle,
            )}
          >
            {header.title}
          </div>
        )}
        {header.description && (
          <div
            className={joinClassNames(
              "text-xs leading-snug text-white/70",
              classNames.headerDescription,
            )}
          >
            {header.description}
          </div>
        )}
      </div>
    </div>
  );
}

export function ContextMenuItem({
  classNames = {},
  isActive,
  item,
  onHover,
  onSelect,
  setButtonRef,
}: {
  classNames?: ContextMenuClassNames;
  isActive: boolean;
  item: ContextMenuResolvedItem;
  onHover: () => void;
  onSelect: (item: ContextMenuResolvedItem, event: React.MouseEvent) => void;
  setButtonRef: (node: HTMLButtonElement | null) => void;
}) {
  if (item.type === "separator") {
    return (
      <div
        className={joinClassNames(
          "mx-1 my-1.5 h-px bg-white/10",
          classNames.separator,
        )}
        role="separator"
      />
    );
  }

  const itemClassName = joinClassNames(
    "group flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium text-white/70 transition-all duration-200 ease-in-out hover:bg-white/10 hover:text-white focus-visible:outline-none data-[active=true]:bg-white/10 data-[active=true]:text-white disabled:pointer-events-none disabled:opacity-50",
    classNames.item,
    item.className,
  );

  const itemIconClassName = joinClassNames(
    "shrink-0 text-white/50 transition-all duration-300 ease-in-out group-hover:text-white/70",
    classNames.itemIcon,
    item.itemIconClassName,
  );

  return (
    <motion.button
      ref={setButtonRef}
      className={itemClassName}
      data-active={isActive ? "true" : undefined}
      aria-disabled={item.disabled}
      disabled={item.disabled}
      role="menuitem"
      type="button"
      whileTap={CONTEXT_MENU_ITEM_TAP}
      transition={CONTEXT_MENU_MICRO_SPRING as any}
      onMouseEnter={onHover}
      onClick={(event) => onSelect(item, event)}
    >
      {item.icon && (
        <IconComponent
          icon={item.icon}
          className={itemIconClassName}
          size={18}
        />
      )}
      <span className={joinClassNames("grow truncate", classNames.itemLabel)}>
        {item.label}
      </span>
      {item.shortcut && (
        <span
          className={joinClassNames(
            "ml-2 shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 text-xs text-white/50 uppercase ring-1 ring-white/10 ring-inset",
            classNames.itemShortcut,
          )}
        >
          {item.shortcut}
        </span>
      )}
    </motion.button>
  );
}

export function ContextMenuContent({
  config,
  items,
  menuContext,
  position,
  onClose,
}: {
  config: ContextMenuConfig;
  items: ContextMenuResolvedItem[];
  menuContext: any;
  position: ContextMenuPosition;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const classNames: ContextMenuClassNames = isObject(config?.classNames)
    ? (config.classNames as ContextMenuClassNames)
    : {};
  const metrics = useMemo(() => getContextMenuMetrics(), []);
  const header = useMemo(
    () => resolveMenuHeader(config, menuContext),
    [config, menuContext],
  );

  const [activeIndex, setActiveIndex] = useState(-1);
  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setActiveIndex(-1);
  }

  useLayoutEffect(() => {
    itemRefs.current = [];
    if (menuRef.current) positionMenu(menuRef.current, position);
  }, [header, items, position]);

  useEffect(() => {
    if (activeIndex < 0) {
      menuRef.current?.focus({ preventScroll: true });
    } else {
      itemRefs.current[activeIndex]?.focus({ preventScroll: true });
    }
  }, [activeIndex]);

  useEffect(() => {
    const menuEl = menuRef.current;
    const preventScroll = (e: Event) => e.preventDefault();
    const listenerOptions = { capture: true, passive: false };

    const handleGlobalInteraction = (event: MouseEvent | KeyboardEvent) => {
      if (
        (event.type === "keydown" &&
          (event as KeyboardEvent).key === "Escape") ||
        (event.type === "mousedown" &&
          menuEl &&
          !menuEl.contains(event.target as Node))
      ) {
        onClose();
      }
      if (
        event.type === "keydown" &&
        !menuEl?.contains(event.target as Node) &&
        isScrollLockKey(event as KeyboardEvent)
      ) {
        event.preventDefault();
      }
    };

    document.addEventListener("mousedown", handleGlobalInteraction, true);
    document.addEventListener("keydown", handleGlobalInteraction, true);
    window.addEventListener("wheel", preventScroll, listenerOptions);
    window.addEventListener("touchmove", preventScroll, listenerOptions);

    return () => {
      document.removeEventListener("mousedown", handleGlobalInteraction, true);
      document.removeEventListener("keydown", handleGlobalInteraction, true);
      window.removeEventListener("wheel", preventScroll, true);
      window.removeEventListener("touchmove", preventScroll, true);
    };
  }, [onClose]);

  const handleItemSelect = useCallback(
    (
      item: ContextMenuResolvedItem,
      event: React.MouseEvent | React.KeyboardEvent,
    ) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (item?.disabled) return;

      const handler = item?.onSelect || item?.onClick;
      if (typeof handler === "function") {
        try {
          const result = handler(event, menuContext);
          if (result && typeof (result as Promise<void>).then === "function") {
            (result as Promise<void>).catch((err: unknown) =>
              console.error("[ContextMenu] Async handler error:", err),
            );
          }
        } catch (error) {
          console.error("[ContextMenu] Handler error:", error);
        }
      }
      if (item?.closeOnSelect !== false) onClose?.();
    },
    [menuContext, onClose],
  );

  const handleMenuKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;

        setActiveIndex((prev) => {
          const isAction = (i: number) =>
            items[i]?.type === "action" && !items[i].disabled;
          let nextIndex = prev + direction;

          while (nextIndex >= 0 && nextIndex < items.length) {
            if (isAction(nextIndex)) return nextIndex;
            nextIndex += direction;
          }

          nextIndex = direction === 1 ? 0 : items.length - 1;
          while (
            nextIndex !== prev &&
            nextIndex >= 0 &&
            nextIndex < items.length
          ) {
            if (isAction(nextIndex)) return nextIndex;
            nextIndex += direction;
          }
          return prev >= 0 ? prev : -1;
        });
        return;
      }

      if (
        (event.key === "Enter" || event.key === " ") &&
        activeIndex >= 0 &&
        items[activeIndex]
      ) {
        event.preventDefault();
        handleItemSelect(items[activeIndex], event);
      }
    },
    [activeIndex, items, handleItemSelect, onClose],
  );

  return (
    <div>
      <div
        data-context-menu-overlay
        className={joinClassNames("fixed inset-0", classNames.overlay)}
        onMouseDown={onClose}
        style={{ zIndex: Z_INDEX.CONTEXT_MENU - 1 }}
      />
      <motion.div
        ref={menuRef}
        data-context-menu-ignore
        variants={menuPopVariants as any}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={joinClassNames(
          "max-w-sm min-w-64 overflow-hidden rounded-[24px] bg-black/80 shadow-[0_18px_56px_rgba(0,0,0,0.50)] ring-1 ring-white/10 backdrop-blur-lg ring-inset",
          classNames.content,
        )}
        role="menu"
        tabIndex={-1}
        style={{
          left: position?.x || 0,
          top: position?.y || 0,
          padding: `${metrics.wrapperPadding}px`,
          position: "fixed",
          zIndex: Z_INDEX.CONTEXT_MENU,
        }}
        onMouseLeave={() => setActiveIndex(-1)}
        onKeyDown={handleMenuKeyDown}
      >
        <motion.div
          variants={menuContentVariants as any}
          initial="hidden"
          animate="visible"
        >
          <ContextMenuHeader classNames={classNames} header={header} />
        </motion.div>

        {items.map((item, index) => (
          <motion.div
            key={item.key || `menu-item-${index}`}
            variants={menuItemVariants as any}
            custom={index}
            initial="hidden"
            animate="visible"
          >
            <ContextMenuItem
              item={item}
              classNames={classNames}
              isActive={index === activeIndex}
              onHover={() => {
                if (item.type === "action" && !item.disabled)
                  setActiveIndex(index);
              }}
              setButtonRef={(node) => {
                itemRefs.current[index] = node;
              }}
              onSelect={handleItemSelect}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

export function ContextMenuRenderer() {
  const { config, context, items, position, isOpen, closeMenu } =
    useContextMenu();
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  if (!isMounted) return null;

  const resolvedItems =
    Array.isArray(items) && items.length > 0
      ? items
      : resolveMenuItems(config, context as any);

  return createPortal(
    <AnimatePresence>
      {isOpen && config && resolvedItems.length > 0 && (
        <ContextMenuContent
          key="context-menu-content"
          config={config}
          items={resolvedItems}
          menuContext={context}
          position={position}
          onClose={closeMenu}
        />
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function ContextMenuGlobal() {
  useContextMenuListener();
  return <ContextMenuRenderer />;
}

export default ContextMenuGlobal;
