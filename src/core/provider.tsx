"use client";

import dynamic from "next/dynamic";
import { useMemo, type JSX, type ReactNode } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Compose, type ProviderEntry } from "./composer";

const DynamicModal = dynamic(
  () => import("./modules/modal").then((m) => m.Modal),
  { ssr: false },
);
import {
  AmbientProvider,
  BackgroundOverlay,
  BackgroundProvider,
  ContextMenuGlobal,
  ContextMenuProvider,
  Controls,
  GlobalError,
  GlobalErrorListener,
  LoadingOverlay,
  LoadingProvider,
  ModalProvider,
  ModuleError,
  Dock,
  DockProvider,
  NotificationContainer,
  NotificationListener,
  NotificationProvider,
  createInlineSurfaceEntry,
  useAmbientTheme,
  useBackgroundActions,
  useBackgroundState,
  useLoadingActions,
  useLoadingState,
  useModalActions,
  useDockContextActions,
  useDockHud,
  useDock,
  useDockActions,
  useDockGuard,
  useToast,
} from "./modules";
import {
  PageControllerProvider,
  RegistryProvider,
  type AppRegistryEntry,
  type PageRuntimeBridge,
} from "@/core/orchestration";


function RegisteredDock({
  enableControls = true,
}: {
  enableControls?: boolean;
}): JSX.Element | null {
  const { dockItems } = useDock();
  if (!dockItems?.length) return null;

  return (
    <>
      <Dock />
      {enableControls && <Controls />}
    </>
  );
}

export interface CoreModulesConfig {
  /** Enable dynamic canvas palette extraction (default: true) */
  ambient?: boolean;
  /** Enable multi-layer background provider & overlay (default: true) */
  background?: boolean;
  /** Enable custom right-click context menu engine (default: true) */
  contextMenu?: boolean;
  /** Enable side rail controls next to the dock (default: true) */
  controls?: boolean;
  /** Enable global anti-flicker loading overlay (default: true) */
  loading?: boolean;
  /** Enable modal dialog stack manager (default: true) */
  modal?: boolean;
  /** Enable dock & task surface shell (default: true) */
  dock?: boolean;
  /** Enable toast notification system (default: true) */
  notifications?: boolean;
  /** Configure or disable global Radix tooltip provider (default: true) */
  tooltip?: boolean | { delayDuration?: number; skipDelayDuration?: number };
}

export interface CoreProviderSlots {
  afterContent?: ReactNode;
  beforeContent?: ReactNode;
  overlays?: ReactNode;
}

export interface CoreProviderProps {
  children: ReactNode;
  modules?: CoreModulesConfig;
  overlays?: ReactNode;
  providers?: readonly ProviderEntry[];
  registryEntries?: readonly AppRegistryEntry[] | AppRegistryEntry[];
  runtimeBridge?: PageRuntimeBridge;
  slots?: CoreProviderSlots;
}

export function CoreProvider({
  children,
  modules,
  overlays,
  providers,
  registryEntries = [],
  runtimeBridge,
  slots,
}: CoreProviderProps): JSX.Element {
  const enableAmbient = modules?.ambient !== false;
  const enableBackground = modules?.background !== false;
  const enableContextMenu = modules?.contextMenu !== false;
  const enableControls = modules?.controls !== false;
  const enableLoading = modules?.loading !== false;
  const enableModal = modules?.modal !== false;
  const enableDock = modules?.dock !== false;
  const enableNotifications = modules?.notifications !== false;
  const enableTooltip = modules?.tooltip !== false;

  const tooltipConfig = useMemo(() => {
    if (typeof modules?.tooltip === "object" && modules.tooltip !== null) {
      return {
        delayDuration: modules.tooltip.delayDuration ?? 300,
        skipDelayDuration: modules.tooltip.skipDelayDuration ?? 150,
      };
    }
    return { delayDuration: 300, skipDelayDuration: 150 };
  }, [modules?.tooltip]);

  const resolvedBridge = useMemo<PageRuntimeBridge>(
    () => ({
      ModuleError,
      createInlineSurfaceEntry,
      ...(enableAmbient ? { useAmbientTheme } : {}),
      ...(enableBackground
        ? { useBackgroundActions, useBackgroundState }
        : {}),
      ...(enableContextMenu ? { useDockContextActions } : {}),
      ...(enableLoading ? { useLoadingActions, useLoadingState } : {}),
      ...(enableModal ? { useModalActions } : {}),
      ...(enableDock
        ? { useDockHud, useDockActions, useDockGuard }
        : {}),
      ...(enableNotifications ? { useToast } : {}),
      ...runtimeBridge,
    }),
    [
      enableAmbient,
      enableBackground,
      enableContextMenu,
      enableLoading,
      enableModal,
      enableDock,
      enableNotifications,
      runtimeBridge,
    ],
  );

  const providerPipeline = useMemo<readonly ProviderEntry[]>(() => {
    const pipeline: ProviderEntry[] = [
      GlobalError,
      [RegistryProvider, { initialEntries: registryEntries }],
    ];

    if (enableNotifications) pipeline.push(NotificationProvider);
    if (enableAmbient) pipeline.push(AmbientProvider);
    if (enableBackground) pipeline.push(BackgroundProvider);
    if (enableLoading) pipeline.push(LoadingProvider);

    pipeline.push([PageControllerProvider, { runtimeBridge: resolvedBridge }]);

    if (enableModal) {
      pipeline.push([ModalProvider, { modalRenderer: DynamicModal }]);
    }
    if (enableContextMenu) pipeline.push(ContextMenuProvider);
    if (enableDock) pipeline.push(DockProvider);
    if (enableTooltip) {
      pipeline.push([TooltipPrimitive.Provider, tooltipConfig]);
    }

    if (providers?.length) {
      pipeline.push(...providers);
    }

    return pipeline;
  }, [
    enableAmbient,
    enableBackground,
    enableContextMenu,
    enableLoading,
    enableModal,
    enableDock,
    enableNotifications,
    enableTooltip,
    providers,
    registryEntries,
    resolvedBridge,
    tooltipConfig,
  ]);

  return (
    <Compose providers={providerPipeline}>
      {enableBackground && <BackgroundOverlay />}
      {slots?.beforeContent}
      {children}
      {slots?.afterContent}
      {enableDock && (
        <RegisteredDock enableControls={enableControls} />
      )}
      {enableContextMenu && <ContextMenuGlobal />}
      {enableLoading && <LoadingOverlay />}
      {overlays}
      {slots?.overlays}
      {enableNotifications && (
        <>
          <NotificationListener />
          <NotificationContainer />
        </>
      )}
      <GlobalErrorListener />
    </Compose>
  );
}
