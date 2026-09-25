"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useRequiredContext } from "@/core/hooks";
import {
  useContextMenuRegistration,
  useContextMenuRegistry,
  useDockRegistry,
} from "@/core/orchestration";
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
  ContextMenuConfig,
  ContextMenuContextApi,
  ContextMenuState,
} from "./types";

export const ContextMenuContext = createContext<ContextMenuContextApi | null>(
  null,
);

export function ContextMenuProvider({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const [menuState, setMenuState] = useState<ContextMenuState>(
    createInitialMenuState,
  );
  const menuStateRef = useRef(menuState);

  useEffect(() => {
    menuStateRef.current = menuState;
  }, [menuState]);

  const openMenu = useCallback((configOrState: any, x?: number, y?: number) => {
    const nextState = resolveNextOpenState(configOrState, x, y);
    if (nextState) {
      menuStateRef.current = nextState;
      setMenuState(nextState);
    }
  }, []);

  const closeMenu = useCallback(() => {
    const current = menuStateRef.current;
    if (!current.isOpen) return;
    const initialState = createInitialMenuState();
    menuStateRef.current = initialState;
    setMenuState(initialState);
    safeInvoke(current.config?.onClose, current.context);
  }, []);

  const bind = useCallback(
    (payload?: any, configOverride?: Partial<ContextMenuConfig>) => ({
      onContextMenu: (event: any) => {
        const activeConfig = configOverride || menuState.config;
        if (!activeConfig) return;

        event?.preventDefault?.();
        event?.stopPropagation?.();

        const point = {
          x: Number(event?.clientX ?? 0),
          y: Number(event?.clientY ?? 0),
        };

        let nextContext: any = {
          currentTarget: event?.currentTarget ?? null,
          event,
          pathname: pathname || "",
          payload,
          point,
          target: (event?.target as Element) ?? null,
        };

        const onOpenResult = safeInvoke(
          activeConfig.onOpen,
          event,
          nextContext,
        );
        if (onOpenResult === false) return;
        if (isObject(onOpenResult)) {
          nextContext = {
            ...nextContext,
            ...(onOpenResult as Record<string, unknown>),
          };
        }

        const nextItems = resolveMenuItems(
          activeConfig as ContextMenuConfig,
          nextContext,
        );
        if (!nextItems.length) return;

        openMenu({
          config: activeConfig,
          context: nextContext,
          items: nextItems,
          position: point,
        });
      },
    }),
    [menuState.config, openMenu, pathname],
  );

  const contextValue = useMemo<ContextMenuContextApi>(
    () => ({
      ...menuState,
      bind,
      closeMenu,
      openMenu,
    }),
    [menuState, bind, openMenu, closeMenu],
  );

  useEffect(
    () => emitContextMenuVisibility(menuState.isOpen),
    [menuState.isOpen],
  );

  return (
    <ContextMenuContext value={contextValue}>{children}</ContextMenuContext>
  );
}

export function useContextMenu(
  config?: Partial<ContextMenuConfig> | null,
  options?: Record<string, unknown>,
): ContextMenuContextApi {
  useContextMenuRegistration(config || null, options);
  const ctx = useRequiredContext(
    ContextMenuContext,
    "useContextMenu",
    "ContextMenuProvider",
  );

  return useMemo(() => {
    if (!config) return ctx;
    return {
      ...ctx,
      bind: (payload?: any, configOverride?: Partial<ContextMenuConfig>) =>
        ctx.bind(payload, { ...config, ...configOverride }),
    };
  }, [config, ctx]);
}

export function useContextMenuActions(): ContextMenuActions {
  const { closeMenu, openMenu } = useRequiredContext(
    ContextMenuContext,
    "useContextMenuActions",
    "ContextMenuProvider",
  );
  return useMemo(() => ({ closeMenu, openMenu }), [closeMenu, openMenu]);
}

export function useContextMenuState(): ContextMenuState {
  const { config, context, isOpen, items, position } = useRequiredContext(
    ContextMenuContext,
    "useContextMenuState",
    "ContextMenuProvider",
  );
  return useMemo(
    () => ({ config, context, isOpen, items, position }),
    [config, context, isOpen, items, position],
  );
}

export function useContextMenuListener(): void {
  const { getAll } = useContextMenuRegistry() as {
    getAll: () => Record<string, any>;
  };
  const { get: getDockItem } = useDockRegistry() as {
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
        getDockItem(pathname || ""),
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
  }, [getAll, getDockItem, openMenu, pathname]);
}
