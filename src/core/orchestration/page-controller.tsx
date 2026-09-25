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
import { createPageRegistryConfig } from "./adapters";
import { usePageRegistry } from "./hooks";
import {
  defaultInlineSurfaceEntry,
  invokePageModal,
  invokePageSurface,
  mergeModuleConfigs,
  resolveEffectivePageModules,
} from "./utils";
import type {
  PageAmbientConfig,
  PageBackgroundConfig,
  PageConfig,
  PageController,
  PageLoadingConfig,
  PageDockConfig,
  PageOptions,
  PageRuntimeBridge,
  PageSurfaceSlot,
} from "./types";

const EMPTY_OBJECT: PageConfig = Object.freeze({});

export interface PageControllerStore {
  getSnapshot: () => PageController | null;
  notify: () => void;
  register: (
    id: string,
    controllerRef: { current: PageController | null },
  ) => void;
  subscribe: (listener: () => void) => () => void;
  unregister: (id: string) => void;
}

export function createPageControllerStore(): PageControllerStore {
  const listeners = new Set<() => void>();
  let stack: {
    controllerRef: { current: PageController | null };
    id: string;
  }[] = [];

  const notify = (): void => {
    listeners.forEach((listener) => {
      try {
        listener();
      } catch {}
    });
  };

  return {
    getSnapshot(): PageController | null {
      const top = stack[stack.length - 1];
      return top?.controllerRef?.current || null;
    },
    notify,
    register(
      id: string,
      controllerRef: { current: PageController | null },
    ): void {
      stack = stack.filter((item) => item.id !== id);
      stack.push({ controllerRef, id });
      notify();
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    unregister(id: string): void {
      stack = stack.filter((item) => item.id !== id);
      notify();
    },
  };
}

const fallbackStandaloneStore = createPageControllerStore();

const noopHook = () => {};
const noopActionsHook = () => ({});
const FALLBACK_TOAST = Object.freeze(
  Object.assign(() => null, {
    dismiss: noopHook,
    dismissAll: noopHook,
    fromResult: (result: any) => result,
    promise: (promise: any) =>
      typeof promise === "function" ? promise() : promise,
  }),
);

const noopToastHook = () => FALLBACK_TOAST;

const PassthroughBoundary = ({ children }: { children?: ReactNode }) => children;

const noopBackgroundStateHook = () => ({
  hasMedia: false,
  isImage: false,
  isPlaying: false,
  isVideo: false,
  videoElement: null,
  videoOptions: {},
});

const noopLoadingStateHook = () => ({
  isLoading: false,
  isPageLoading: false,
  message: null,
  skeleton: null,
});

const noopLoadingActionsHook = () => ({
  setLoading: () => {},
  setSkeleton: () => {},
  startLoading: () => {},
  stopLoading: () => {},
  withLoading: async (task: any) =>
    typeof task === "function" ? task() : task,
});

const DEFAULT_RUNTIME_BRIDGE: Required<PageRuntimeBridge> = Object.freeze({
  ModuleError: PassthroughBoundary,
  createInlineSurfaceEntry: defaultInlineSurfaceEntry,
  useAmbientTheme: noopHook,
  useBackgroundActions: noopActionsHook,
  useBackgroundState: noopBackgroundStateHook,
  useLoadingActions: noopLoadingActionsHook,
  useLoadingState: noopLoadingStateHook,
  useModalActions: noopActionsHook,
  useDockContextActions: noopHook,
  useDockHud: noopHook,
  useDockActions: noopActionsHook,
  useDockGuard: noopHook,
  useToast: noopToastHook,
});

export interface PageRuntimeContextValue {
  bridge: Required<PageRuntimeBridge>;
  store: PageControllerStore;
}

export const PageControllerContext = createContext<PageController | null>(null);
export const PageRuntimeBridgeContext = createContext<PageRuntimeContextValue>({
  bridge: DEFAULT_RUNTIME_BRIDGE,
  store: fallbackStandaloneStore,
});

export interface PageControllerProviderProps {
  children?: ReactNode;
  runtimeBridge?: PageRuntimeBridge;
}

export function PageControllerProvider({
  children,
  runtimeBridge,
}: PageControllerProviderProps) {
  const [store] = useState<PageControllerStore>(() =>
    createPageControllerStore(),
  );

  const value = useMemo<PageRuntimeContextValue>(
    () => ({
      bridge: {
        ...DEFAULT_RUNTIME_BRIDGE,
        ...(runtimeBridge || {}),
      },
      store,
    }),
    [runtimeBridge, store],
  );

  return (
    <PageRuntimeBridgeContext value={value}>
      {children}
    </PageRuntimeBridgeContext>
  );
}

export function usePageRuntimeBridge(): Required<PageRuntimeBridge> {
  return use(PageRuntimeBridgeContext).bridge;
}

export function useDockHudRegistration(
  config: any,
  options?: { enabled?: boolean; [key: string]: any },
): void {
  const { bridge } = use(PageRuntimeBridgeContext);
  bridge.useDockHud(options?.enabled === false ? null : config);
}

const emptySubscribe = () => () => {};
const getNullSnapshot = () => null;

const FALLBACK_BACKGROUND_CONTROLLER = Object.freeze({
  set: noopHook,
  setVideoPlaying: noopHook,
  toggleMute: noopHook,
  toggleVideo: noopHook,
});

const EMPTY_RECORD: Record<string, any> = Object.freeze({});

const FALLBACK_PAGE_CONTROLLER: PageController = Object.freeze({
  Provider: PassthroughBoundary,
  background: FALLBACK_BACKGROUND_CONTROLLER,
  closeAllModals: noopHook,
  closeAllSurfaces: noopHook,
  closeModal: noopHook,
  closeSurface: noopHook,
  config: EMPTY_OBJECT,
  modal: async () => undefined,
  modals: EMPTY_RECORD,
  reset: noopHook,
  set: noopHook,
  setActions: noopHook,
  setAmbient: noopHook,
  setBackground: noopHook,
  setBanner: noopHook,
  setControls: noopHook,
  setDescription: noopHook,
  setIcon: noopHook,
  setLoading: noopHook,
  setDock: noopHook,
  setTitle: noopHook,
  surface: () => undefined,
  surfaces: EMPTY_RECORD,
  toast: FALLBACK_TOAST,
});

/**
 * Pure consumer hook that reads the active `PageController` from either a scoped
 * `<page.Provider>` boundary or the nearest `PageControllerProvider` store without
 * registering page modules or invoking runtime side-effect hooks.
 */
export function usePageController(): PageController {
  const scopedContext = use(PageControllerContext);
  const { store: controllerStore } = use(PageRuntimeBridgeContext);

  const storeSubscribe = scopedContext
    ? emptySubscribe
    : controllerStore.subscribe;
  const storeSnapshot = scopedContext
    ? getNullSnapshot
    : controllerStore.getSnapshot;

  const storeController = useSyncExternalStore(
    storeSubscribe,
    storeSnapshot,
    getNullSnapshot,
  );

  return scopedContext ?? storeController ?? FALLBACK_PAGE_CONTROLLER;
}

export const usePageContext = usePageController;

/**
 * Producer hook that declares and registers page-level configuration (dock,
 * background, ambient theme, guards, modals, surfaces) and publishes the active
 * `PageController` to `PageControllerStore`.
 */
export function usePage(
  pageConfig: PageConfig = EMPTY_OBJECT,
  options?: PageOptions,
): PageController {
  const instanceId = useId();
  const { bridge, store: controllerStore } = use(PageRuntimeBridgeContext);

  const [overrides, setOverrides] = useState<Partial<PageConfig>>(EMPTY_OBJECT);

  const set = useCallback((partial: Partial<PageConfig>) => {
    if (!partial || typeof partial !== "object") return;
    setOverrides((prev) => mergeModuleConfigs(prev, partial));
  }, []);

  const reset = useCallback(() => {
    setOverrides(EMPTY_OBJECT);
  }, []);

  const setDock = useCallback(
    (dockConfig: PageDockConfig) => set({ dock: dockConfig }),
    [set],
  );

  const setTitle = useCallback(
    (title: string) => set({ dock: { title } }),
    [set],
  );

  const setDescription = useCallback(
    (description: string) => set({ dock: { description } }),
    [set],
  );

  const setIcon = useCallback((icon: any) => set({ dock: { icon } }), [set]);

  const setBanner = useCallback(
    (banner: string) => set({ dock: { banner } }),
    [set],
  );

  const setBackground = useCallback(
    (background: string | PageBackgroundConfig | Record<string, any>) => {
      const bgConfig =
        typeof background === "string" ? { image: background } : background;
      set({ background: bgConfig });
    },
    [set],
  );

  const setLoading = useCallback(
    (loading: boolean | string | PageLoadingConfig) => {
      let loadingConfig: PageLoadingConfig;
      if (typeof loading === "boolean") {
        loadingConfig = { isLoading: loading };
      } else if (typeof loading === "string") {
        loadingConfig = { isLoading: true, message: loading };
      } else {
        loadingConfig = loading;
      }
      set({ loading: loadingConfig });
    },
    [set],
  );

  const setControls = useCallback(
    (controls: any) => set({ controls }),
    [set],
  );

  const setActions = useCallback(
    (actions: any[]) => set({ dock: { actions } }),
    [set],
  );

  const setAmbient = useCallback(
    (ambient: boolean | string | PageAmbientConfig) => set({ ambient }),
    [set],
  );

  const effectiveConfig = useMemo<PageConfig>(() => {
    const base = pageConfig || EMPTY_OBJECT;
    if (Object.keys(overrides).length === 0) return base;
    return mergeModuleConfigs(base, overrides);
  }, [pageConfig, overrides]);

  const resolvedModules = useMemo(
    () => resolveEffectivePageModules(effectiveConfig, false),
    [effectiveConfig],
  );

  const registryPayload = useMemo(
    () =>
      createPageRegistryConfig(
        {
          ...(resolvedModules.customConfigs || {}),
          background: resolvedModules.background,
          contextMenu: resolvedModules.contextMenu,
          controls: resolvedModules.controls,
          loading: resolvedModules.loading,
          modal: resolvedModules.modal,
          dock: resolvedModules.dock,
        },
        options,
      ),
    [options, resolvedModules],
  );

  usePageRegistry(registryPayload);
  bridge.useAmbientTheme(resolvedModules.ambient || null);
  bridge.useDockGuard(resolvedModules.guard);
  bridge.useDockContextActions(resolvedModules.actions);

  const pageToastDuration =
    typeof effectiveConfig.toast === "number"
      ? effectiveConfig.toast
      : effectiveConfig.toast?.duration;

  const dockActions = bridge.useDockActions();
  const modalActions = bridge.useModalActions();
  const bgActions = bridge.useBackgroundActions();
  const toast = bridge.useToast(pageToastDuration);
  const createInlineSurfaceEntry = bridge.createInlineSurfaceEntry;

  const surfacesDict = useMemo(
    () => ({ ...(effectiveConfig.surfaces || {}) }),
    [effectiveConfig.surfaces],
  );

  const modalsDict = useMemo(
    () => ({
      ...(effectiveConfig.modals || {}),
      ...(typeof effectiveConfig.modal === "object" &&
      effectiveConfig.modal !== null
        ? (effectiveConfig.modal as Record<string, any>)
        : {}),
    }),
    [effectiveConfig.modals, effectiveConfig.modal],
  );

  const surface = useCallback(
    (idOrDef: PageSurfaceSlot | string, props: Record<string, any> = {}) =>
      invokePageSurface(idOrDef, props, {
        createInlineSurfaceEntry,
        dockActions,
        surfacesDict,
      }),
    [createInlineSurfaceEntry, dockActions, surfacesDict],
  );

  const modal = useCallback(
    (idOrDef: any, props: Record<string, any> = {}) =>
      invokePageModal(idOrDef, props, {
        modalActions,
        modalsDict,
      }),
    [modalActions, modalsDict],
  );

  const closeSurface = useCallback(
    (id?: string) => dockActions?.closeSurface?.(id),
    [dockActions],
  );

  const closeAllSurfaces = useCallback(
    () => dockActions?.closeAllSurfaces?.(),
    [dockActions],
  );

  const closeModal = useCallback(
    (id: string | number) => modalActions?.closeModal?.(id),
    [modalActions],
  );

  const closeAllModals = useCallback(
    () => modalActions?.closeAllModals?.(),
    [modalActions],
  );

  const backgroundController = useMemo(
    () => ({
      set: (bg: any) => setBackground(bg),
      setVideoPlaying: (playing: boolean) =>
        bgActions?.setVideoPlaying?.(playing),
      toggleMute: () => bgActions?.toggleMute?.(),
      toggleVideo: () => bgActions?.toggleVideo?.(),
    }),
    [setBackground, bgActions],
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
      setDock,
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
    setDock,
    setTitle,
    surface,
    surfacesDict,
    toast,
  ]);

  const controllerRef = useRef<PageController | null>(controller);

  useEffect(() => {
    controllerRef.current = controller;
    controllerStore.notify();
  }, [controller, controllerStore]);

  useEffect(() => {
    controllerStore.register(instanceId, controllerRef);
    return () => {
      controllerStore.unregister(instanceId);
    };
  }, [controllerStore, instanceId]);

  return controller;
}

