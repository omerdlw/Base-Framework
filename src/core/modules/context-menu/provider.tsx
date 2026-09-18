"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useContextMenuRegistry, useNavRegistry } from "@/core/orchestration";
import { resolveContextMenu, resolveMenuItems } from "./resolver";
import {
  createInitialMenuState,
  emitContextMenuVisibility,
  isObject,
  resolveContextMenuPageMeta,
  resolveNextOpenState,
  safeInvoke,
} from "./utils";
import type {
  ContextMenuActions,
  ContextMenuContextApi,
  ContextMenuState,
} from "./types";

export const ContextMenuActionsContext =
  createContext<ContextMenuActions | null>(null);
export const ContextMenuStateContext = createContext<ContextMenuState | null>(
  null,
);
export const ContextMenuContext = createContext<ContextMenuContextApi | null>(
  null,
);

export function ContextMenuProvider({ children }: { children?: ReactNode }) {
  const [menuState, setMenuState] = useState<ContextMenuState>(
    createInitialMenuState,
  );

  const openMenu = useCallback((configOrState: any, x?: number, y?: number) => {
    const nextState = resolveNextOpenState(configOrState, x, y);
    if (nextState) {
      setMenuState(nextState);
    }
  }, []);

  const closeMenu = useCallback(() => {
    setMenuState((currentState) => {
      if (!currentState.isOpen) return currentState;
      safeInvoke(currentState.config?.onClose, currentState.context);
      return createInitialMenuState();
    });
  }, []);

  const actionsValue = useMemo<ContextMenuActions>(
    () => ({
      closeMenu,
      openMenu,
    }),
    [closeMenu, openMenu],
  );

  const legacyValue = useMemo<ContextMenuContextApi>(
    () => ({
      menuConfig: menuState.config,
      menuContext: menuState.context,
      menuItems: menuState.items,
      position: menuState.position,
      isOpen: menuState.isOpen,
      openMenu,
      closeMenu,
    }),
    [menuState, openMenu, closeMenu],
  );

  useEffect(
    () => emitContextMenuVisibility(menuState.isOpen),
    [menuState.isOpen],
  );

  return (
    <ContextMenuActionsContext value={actionsValue}>
      <ContextMenuStateContext value={menuState}>
        <ContextMenuContext value={legacyValue}>{children}</ContextMenuContext>
      </ContextMenuStateContext>
    </ContextMenuActionsContext>
  );
}

export function useContextMenuActions(): ContextMenuActions {
  const context = use(ContextMenuActionsContext);
  if (!context)
    throw new Error(
      "useContextMenuActions must be used within ContextMenuProvider",
    );
  return context;
}

export function useContextMenuState(): ContextMenuState {
  const context = use(ContextMenuStateContext);
  if (!context)
    throw new Error(
      "useContextMenuState must be used within ContextMenuProvider",
    );
  return context;
}

export function useContextMenu(): ContextMenuContextApi {
  const context = use(ContextMenuContext);
  if (!context)
    throw new Error("useContextMenu must be used within ContextMenuProvider");
  return context;
}

export function useContextMenuListener(): void {
  const { getAll } = useContextMenuRegistry() as {
    getAll: () => Record<string, any>;
  };
  const { get: getNavItem } = useNavRegistry() as {
    get: (path: string) => any;
  };
  const { openMenu } = useContextMenuActions();
  const pathname = usePathname();

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      const resolvedMenu = resolveContextMenu(
        getAll(),
        pathname || undefined,
        event,
      );
      if (!resolvedMenu) return;

      event.preventDefault();
      event.stopPropagation();

      const pageMeta = resolveContextMenuPageMeta(
        getNavItem(pathname || ""),
        pathname || "",
      );
      let nextContext: Record<string, any> = {
        ...(isObject(resolvedMenu.context) ? resolvedMenu.context : {}),
        ...(pageMeta ? { page: pageMeta } : {}),
      };

      const onOpenResult = safeInvoke(
        resolvedMenu.config?.onOpen,
        event,
        nextContext,
      );
      if (onOpenResult === false) return;

      if (isObject(onOpenResult))
        nextContext = {
          ...nextContext,
          ...(onOpenResult as Record<string, unknown>),
        };

      const nextItems = resolveMenuItems(
        resolvedMenu.config,
        nextContext as any,
      );
      if (!nextItems.length) return;

      openMenu({
        config: resolvedMenu.config,
        context: nextContext,
        items: nextItems,
        position: { x: event.clientX, y: event.clientY },
      });
    };

    document.addEventListener("contextmenu", handleContextMenu, true);
    return () =>
      document.removeEventListener("contextmenu", handleContextMenu, true);
  }, [getAll, getNavItem, openMenu, pathname]);
}
