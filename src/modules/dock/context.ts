"use client";

import { createContext, type ComponentType } from "react";
import { useRequiredContext, useStore } from "@/core/hooks";
import { definePeer, type ModuleStateOf } from "@/core/kernel";
import { createStore, shallowEqual } from "@/core/utils";
import {
  type DockActions,
  type DockContextValue,
  type DockState,
  type ErrorActionsProps,
  type GuardActionsProps,
} from "./types";

export const DockContext = createContext<DockContextValue | null>(null);

export function useDockState(): DockState {
  const { store } = useRequiredContext(
    DockContext,
    "useDockState",
    "DockProvider",
  );
  return useStore(store);
}

export function useDockSelector<T>(
  selector: (state: DockState) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const { store } = useRequiredContext(
    DockContext,
    "useDockSelector",
    "DockProvider",
  );
  return useStore(store, selector, isEqual);
}

export function useDockActions(): DockActions {
  return useRequiredContext(DockContext, "useDockActions", "DockProvider")
    .actions;
}

export function useDockHeight() {
  const dockHeight = useDockSelector((state) => state.dockHeight);
  return { dockHeight, padding: { paddingBottom: `${dockHeight}px` } };
}

export const EMPTY_DOCK_STATE: DockState = Object.freeze({
  activeItem: null,
  activeOperation: null,
  activeSurfaceEntry: null,
  activeSurfaceId: null,
  contextActions: [],
  dockContinuity: [],
  dockHeight: 0,
  dockReturnHandoffs: [],
  expanded: false,
  hud: null,
  hudEntries: [],
  isHudActive: false,
  isSurfaceOpen: false,
  locationKey: "",
  operations: [],
  pathname: "",
  searchQuery: "",
  selectionMode: null,
  surfaceLifecycle: "",
  surfacePhase: "",
  surfaceStack: [],
});

export type DockBackgroundView = Pick<
  ModuleStateOf<"background">,
  "isPlaying" | "isVideo" | "videoElement" | "videoOptions"
>;

const backgroundPeer = definePeer("background", {
  actions: Object.freeze({
    resetBackground: () => {},
    setBackground: () => {},
    setVideoElement: () => {},
    setVideoMuted: () => {},
    setVideoPlaying: () => {},
    toggleLoop: () => {},
    toggleMute: () => {},
    toggleVideo: () => {},
  }),
  store: createStore<ModuleStateOf<"background">>({
    hasBackground: false,
    isPlaying: false,
    isVideo: false,
    isYouTube: false,
    posterUrl: null,
    videoElement: null,
    videoOptions: {},
    youtubeVideoId: null,
  }),
});

const selectDockBackground = ({
  isPlaying,
  isVideo,
  videoElement,
  videoOptions,
}: ModuleStateOf<"background">): DockBackgroundView => ({
  isPlaying,
  isVideo,
  videoElement,
  videoOptions,
});

export function useDockBackgroundState(): DockBackgroundView {
  return backgroundPeer.useState(selectDockBackground, shallowEqual);
}

const selectIsVideo = (state: ModuleStateOf<"background">): boolean =>
  state.isVideo;

export function useDockIsVideo(): boolean {
  return backgroundPeer.useState(selectIsVideo);
}

export const useDockBackgroundActions = backgroundPeer.useActions;

const loadingPeer = definePeer("loading", {
  actions: {
    setLoading: () => {},
    setSkeleton: () => {},
    startLoading: () => {},
    stopLoading: () => {},
    withLoading: async (task) => (typeof task === "function" ? task() : task),
  },
  store: createStore<ModuleStateOf<"loading">>({
    isLoading: false,
    isPageLoading: false,
    message: null,
    minDuration: 0,
    showOverlay: false,
    skeleton: null,
  }),
});

export function useDockLoadingState(): ModuleStateOf<"loading"> {
  return loadingPeer.useState((state) => state);
}

export const useDockLoadingActions = loadingPeer.useActions;

const notificationPeer = definePeer("notification", {
  actions: {
    dismissAllNotifications: () => {},
    dismissNotification: () => {},
    showNotification: () => null,
  },
  store: createStore<ModuleStateOf<"notification">>({ notifications: {} }),
});

export function useDockNotificationVisible(): boolean {
  return notificationPeer.useState(
    ({ notifications }) => Object.keys(notifications).length > 0,
  );
}

export const statusActionDefaults: {
  error: ComponentType<ErrorActionsProps> | null;
  guard: ComponentType<GuardActionsProps> | null;
} = { error: null, guard: null };
