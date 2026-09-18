"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useAmbientTheme } from "@/core/modules/ambient";
import { useBackgroundActions } from "@/core/modules/background";
import { useModalActions } from "@/core/modules/modal";
import {
  createInlineSurfaceEntry,
  useNavContextActions,
  useNavigationActions,
  useNavigationGuard,
} from "@/core/modules/nav";
import { useToast } from "@/core/modules/notification";
import {
  useBackground,
  useContextMenu,
  useControls,
  useLoading,
  useModal,
  useNav,
} from "./adapters";
import {
  createFallbackController,
  mergeModuleConfigs,
  resolvePageActions,
  resolvePageAmbient,
  resolvePageBackground,
  resolvePageGuard,
  resolvePageLoading,
  resolvePageNav,
} from "./utils";
import type { PageConfig, PageController, PageOptions } from "./types";

const EMPTY_OBJECT: PageConfig = Object.freeze({});

const pageControllerStore = {
  listeners: new Set<() => void>(),
  stack: [] as {
    controllerRef: { current: PageController | null };
    id: string;
  }[],
  getSnapshot(): PageController | null {
    const top = pageControllerStore.stack[pageControllerStore.stack.length - 1];
    return top?.controllerRef?.current || null;
  },
  notify(): void {
    pageControllerStore.listeners.forEach((listener) => {
      try {
        listener();
      } catch {}
    });
  },
  register(
    id: string,
    controllerRef: { current: PageController | null },
  ): void {
    pageControllerStore.stack = pageControllerStore.stack.filter(
      (item) => item.id !== id,
    );
    pageControllerStore.stack.push({ controllerRef, id });
    pageControllerStore.notify();
  },
  subscribe(listener: () => void): () => void {
    pageControllerStore.listeners.add(listener);
    return () => {
      pageControllerStore.listeners.delete(listener);
    };
  },
  unregister(id: string): void {
    pageControllerStore.stack = pageControllerStore.stack.filter(
      (item) => item.id !== id,
    );
    pageControllerStore.notify();
  },
};

export const PageControllerContext = createContext<PageController | null>(null);

export function PageControllerProvider({ children }: { children?: ReactNode }) {
  return children;
}

export function usePage(
  pageConfig?: PageConfig,
  options?: PageOptions,
): PageController {
  const isConsumer = arguments.length === 0 || pageConfig === undefined;
  const instanceId = useId();
  const scopedContext = use(PageControllerContext);

  const emptySubscribe = useCallback(() => () => {}, []);
  const getNullSnapshot = useCallback(() => null, []);

  const storeSubscribe = isConsumer
    ? pageControllerStore.subscribe
    : emptySubscribe;
  const storeSnapshot = isConsumer
    ? pageControllerStore.getSnapshot
    : getNullSnapshot;

  const storeController = useSyncExternalStore(
    storeSubscribe,
    storeSnapshot,
    getNullSnapshot,
  );

  const [overrides, setOverrides] = useState<Partial<PageConfig>>(EMPTY_OBJECT);

  const set = useCallback((partial: Partial<PageConfig>) => {
    if (!partial || typeof partial !== "object") return;
    setOverrides((prev) => mergeModuleConfigs(prev, partial));
  }, []);

  const reset = useCallback(() => {
    setOverrides(EMPTY_OBJECT);
  }, []);

  const setNav = useCallback(
    (navConfig: any) => set({ nav: navConfig }),
    [set],
  );

  const setTitle = useCallback((title: any) => set({ nav: { title } }), [set]);

  const setDescription = useCallback(
    (description: any) => set({ nav: { description } }),
    [set],
  );

  const setIcon = useCallback((icon: any) => set({ nav: { icon } }), [set]);

  const setBanner = useCallback(
    (banner: any) => set({ nav: { banner } }),
    [set],
  );

  const setBackground = useCallback(
    (background: any) => {
      const bgConfig =
        typeof background === "string" ? { preset: background } : background;
      set({ background: bgConfig });
    },
    [set],
  );

  const setLoading = useCallback(
    (loading: any) => {
      let loadingConfig = loading;
      if (typeof loading === "boolean") {
        loadingConfig = { isLoading: loading };
      } else if (typeof loading === "string") {
        loadingConfig = { isLoading: true, message: loading };
      }
      set({ loading: loadingConfig });
    },
    [set],
  );

  const setControls = useCallback((controls: any) => set({ controls }), [set]);

  const setActions = useCallback(
    (actions: any) => set({ nav: { actions } }),
    [set],
  );

  const setAmbient = useCallback((ambient: any) => set({ ambient }), [set]);

  const effectiveConfig = useMemo<PageConfig>(() => {
    if (isConsumer) return EMPTY_OBJECT;
    const base = pageConfig || EMPTY_OBJECT;
    if (Object.keys(overrides).length === 0) return base;
    return mergeModuleConfigs(base, overrides);
  }, [isConsumer, pageConfig, overrides]);

  const resolvedNav = useMemo(
    () => (isConsumer ? null : resolvePageNav(effectiveConfig)),
    [isConsumer, effectiveConfig],
  );

  const resolvedBackground = useMemo(
    () => (isConsumer ? null : resolvePageBackground(effectiveConfig)),
    [isConsumer, effectiveConfig],
  );

  const resolvedAmbient = useMemo(
    () => (isConsumer ? null : resolvePageAmbient(effectiveConfig)),
    [isConsumer, effectiveConfig],
  );

  const resolvedLoading = useMemo(
    () => (isConsumer ? null : resolvePageLoading(effectiveConfig)),
    [isConsumer, effectiveConfig],
  );

  const resolvedControls = useMemo(
    () => (isConsumer ? null : effectiveConfig.controls || null),
    [isConsumer, effectiveConfig],
  );

  const resolvedActions = useMemo(
    () => (isConsumer ? [] : resolvePageActions(effectiveConfig)),
    [isConsumer, effectiveConfig],
  );

  const resolvedContextMenu = useMemo(
    () => (isConsumer ? null : effectiveConfig.contextMenu || null),
    [isConsumer, effectiveConfig],
  );

  const resolvedModal = useMemo(
    () => (isConsumer ? null : effectiveConfig.modal || null),
    [isConsumer, effectiveConfig],
  );

  const guardOptions = useMemo(
    () => (isConsumer ? { when: false } : resolvePageGuard(effectiveConfig)),
    [isConsumer, effectiveConfig],
  );

  useNav(resolvedNav, options);
  useBackground(resolvedBackground, options);
  useControls(resolvedControls, options);
  useModal(resolvedModal, options);
  useContextMenu(resolvedContextMenu, options);
  useLoading(resolvedLoading, options);
  useAmbientTheme(resolvedAmbient || null);
  useNavigationGuard(guardOptions);
  useNavContextActions(resolvedActions);

  const navActions = useNavigationActions();
  const modalActions = useModalActions();
  const bgActions = useBackgroundActions();
  const toast = useToast();

  const surfacesDict = useMemo(
    () => ({ ...(effectiveConfig.surfaces || {}) }),
    [effectiveConfig.surfaces],
  );

  const modalsDict = useMemo(
    () => ({
      ...(effectiveConfig.modals || {}),
      ...(effectiveConfig.modal || {}),
    }),
    [effectiveConfig.modals, effectiveConfig.modal],
  );

  const surface = useCallback(
    (idOrDef: any, props: Record<string, any> = {}) => {
      let target = idOrDef;
      if (typeof idOrDef === "string") {
        target = surfacesDict[idOrDef];
        if (!target) return undefined;
      }
      if (typeof target?.open === "function") {
        return target.open(props);
      }
      if (typeof target === "function") {
        try {
          const potentialEntry = target(props);
          if (
            potentialEntry &&
            typeof potentialEntry === "object" &&
            (potentialEntry.component ||
              potentialEntry.id ||
              potentialEntry.render)
          ) {
            return navActions.openSurface(potentialEntry);
          }
        } catch {
          return navActions.openSurface(
            createInlineSurfaceEntry({ component: target, props }),
          );
        }
        return navActions.openSurface(
          createInlineSurfaceEntry({ component: target, props }),
        );
      }
      if (target && typeof target === "object") {
        return navActions.openSurface(target);
      }
      return undefined;
    },
    [navActions, surfacesDict],
  );

  const modal = useCallback(
    (idOrDef: any, props: Record<string, any> = {}) => {
      let target = idOrDef;
      if (typeof idOrDef === "string") {
        target = modalsDict[idOrDef];
        if (!target) return undefined;
      }
      if (typeof target?.open === "function") {
        return target.open(props);
      }
      if (target) {
        return modalActions.openModal(target, props);
      }
      return undefined;
    },
    [modalActions, modalsDict],
  );

  const closeSurface = useCallback(
    (id: string) => navActions.closeSurface(id),
    [navActions],
  );

  const closeAllSurfaces = useCallback(
    () => navActions.closeAllSurfaces(),
    [navActions],
  );

  const closeModal = useCallback(
    (id: string) => modalActions.closeModal(id),
    [modalActions],
  );

  const closeAllModals = useCallback(
    () => modalActions.closeAllModals(),
    [modalActions],
  );

  const backgroundController = useMemo(
    () => ({
      set: (bg: any) => setBackground(bg),
      setVideoPlaying: (playing: boolean) =>
        bgActions.setVideoPlaying?.(playing),
      toggleMute: () => bgActions.toggleMute?.(),
      toggleVideo: () => bgActions.toggleVideo?.(),
    }),
    [setBackground, bgActions],
  );

  const fallbackController = useMemo(
    () =>
      createFallbackController({
        bgActions,
        modalActions,
        navActions,
        toast,
      }),
    [bgActions, modalActions, navActions, toast],
  );

  const controller = useMemo<PageController>(() => {
    const ctrl: PageController = {
      background: backgroundController,
      closeAllModals,
      closeAllSurfaces,
      closeModal,
      closeSurface,
      config: effectiveConfig,
      modal,
      modals: modalsDict,
      reset,
      set,
      setActions,
      setAmbient,
      setBackground,
      setBanner,
      setControls,
      setDescription,
      setIcon,
      setLoading,
      setNav,
      setTitle,
      surface,
      surfaces: surfacesDict,
      toast,
      Provider: function PageProvider({ children }: { children?: ReactNode }) {
        return (
          <PageControllerContext value={ctrl}>{children}</PageControllerContext>
        );
      },
    };

    return ctrl;
  }, [
    backgroundController,
    closeAllModals,
    closeAllSurfaces,
    closeModal,
    closeSurface,
    effectiveConfig,
    modal,
    modalsDict,
    reset,
    set,
    setActions,
    setAmbient,
    setBackground,
    setBanner,
    setControls,
    setDescription,
    setIcon,
    setLoading,
    setNav,
    setTitle,
    surface,
    surfacesDict,
    toast,
  ]);

  const controllerRef = useRef<PageController | null>(controller);

  useEffect(() => {
    controllerRef.current = controller;
  });

  useEffect(() => {
    if (isConsumer) return undefined;
    pageControllerStore.register(instanceId, controllerRef);
    return () => {
      pageControllerStore.unregister(instanceId);
    };
  }, [isConsumer, instanceId]);

  const resolvedController = useMemo(() => {
    if (!isConsumer) return controller;
    return scopedContext || storeController || fallbackController;
  }, [
    isConsumer,
    controller,
    scopedContext,
    storeController,
    fallbackController,
  ]);

  return resolvedController;
}

export const usePageController = usePage;
export const usePageContext = usePage;
