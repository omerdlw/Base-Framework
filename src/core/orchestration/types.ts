import type { ComponentType, ReactNode } from "react";

export type RegistryType =
  | "CONTEXT_MENU"
  | "BACKGROUND"
  | "CONTROLS"
  | "LOADING"
  | "MODAL"
  | "DOCK"
  | string;

export interface AppRegistryEntry<T = any> {
  type: string;
  items: Record<string, T>;
}

export type RegistrySource = "static" | "dynamic" | "user" | string;

export type RegistryLifecycle =
  | "immediate"
  | "graceful"
  | "persistent"
  | "route"
  | string;

export type RegistryValidationMode = "warn" | "strict";

export type RegistryScopeKind =
  | "app"
  | "session"
  | "route"
  | "instance"
  | "workspace"
  | string;

export interface RegistryMetadata {
  cleanup?: RegistryLifecycle;
  cleanupDelayMs?: number | null;
  instanceId?: string | null;
  lifecycle?: RegistryLifecycle;
  priority?: number;
  source?: string;
  scope?: string;
  validation?: RegistryValidationMode;
  [key: string]: any;
}

export interface RegistryDefinition {
  defaultCleanupDelayMs: number | null;
  defaultLifecycle: RegistryLifecycle;
  keyPolicy: "route" | "singleton" | "named" | "path" | string;
  resolver: "priority" | "merge" | string;
  valueKind: "object" | "component" | string;
}

export interface RegistryModuleConfig extends RegistryDefinition {
  featureKey?: string;
  singletonKey?: string;
  validator?: (config: any) => ValidationResult;
}

export type PageResolverFn<T = any> = (effectiveConfig: PageConfig) => T;

export interface PageRuntimeBridge {
  ModuleError?: ComponentType<{
    children: ReactNode;
    moduleName?: string;
    name?: string;
  }>;
  createInlineSurfaceEntry?: (surface: any) => any;
  useAmbientTheme?: (config: any) => void;
  useBackgroundActions?: () => any;
  useBackgroundState?: () => any;
  useLoadingActions?: () => any;
  useLoadingState?: () => any;
  useModalActions?: () => any;
  useDockContextActions?: (actions: any[]) => void;
  useDockHud?: (config: any) => void;
  useDockActions?: () => any;
  useDockGuard?: (options: any) => void;
  useToast?: (defaultDuration?: number | null) => any;
}

export interface ValidationResult {
  valid: boolean;
  issues: string[];
  reason?: string;
}

export interface SourceRecord<T = any> {
  updatedAt: number;
  sequence: number;
  instanceId: string | null;
  priority: number;
  source: string;
  scope: string;
  value: T;
}

export interface RegisterOperation<T = any> {
  kind: "register";
  validation?: RegistryValidationMode;
  source: string;
  scope: string;
  record: SourceRecord<T>;
  instanceId: string | null;
  type: string;
  key: string;
}

export interface UnregisterOperation {
  kind: "unregister";
  instanceId: string | null;
  scope: string | null;
  source: string;
  type: string;
  key: string;
}

export type RegistryOperation = RegisterOperation | UnregisterOperation;

export interface RegistrationHandle<T = any> {
  (reason?: string): boolean;
  active: boolean;
  dispose: (reason?: string) => boolean;
  instanceId: string | null;
  key: string;
  priority: number;
  reason?: string;
  source: string;
  status:
    "active" | "disposed" | "superseded" | "rejected" | "ignored" | string;
  type: string;
  update: (value: T, options?: Record<string, any>) => RegistrationHandle<T>;
  updatedAt: number;
  validation: string;
}

export interface RegistrySchema {
  BACKGROUND: PageBackgroundConfig;
  CONTEXT_MENU: Record<string, any>;
  CONTROLS: Record<string, any>;
  LOADING: PageLoadingConfig;
  MODAL: Record<string, any>;
  DOCK: PageDockConfig;
  ambient: Record<string, any>;
  background: PageBackgroundConfig;
  "context-menu": Record<string, any>;
  controls: Record<string, any>;
  loading: PageLoadingConfig;
  modal: Record<string, any>;
  dock: PageDockConfig;
  surface: Record<string, any>;
  [key: string]: any;
}

export type RegistryTypeKey = keyof RegistrySchema & string;

export interface RegistryQueue {
  register: <K extends RegistryTypeKey = RegistryTypeKey, T = RegistrySchema[K]>(
    type: K,
    key: string,
    item: T,
    sourceOrOptions?: string | Record<string, any>,
    optionsArg?: Record<string, any>,
  ) => RegistrationHandle<T>;
  unregister: <K extends RegistryTypeKey = RegistryTypeKey>(
    type: K,
    key: string,
    sourceOrOptions?: string | Record<string, any>,
  ) => void;
}

export interface RegistryStore {
  batch: (executor: (queue: RegistryQueue) => void) => number;
  dispose: (operation: any, reason?: string) => boolean;
  getEntriesSnapshot: <
    K extends RegistryTypeKey = RegistryTypeKey,
    T = RegistrySchema[K],
  >(
    type: K,
    scope?: string | null,
  ) => Record<string, T>;
  getSnapshot: <
    K extends RegistryTypeKey = RegistryTypeKey,
    T = RegistrySchema[K],
  >(
    type: K,
    key: string,
    scope?: string | null,
  ) => T | undefined;
  isCurrent: (operation: any) => boolean;
  register: <K extends RegistryTypeKey = RegistryTypeKey, T = RegistrySchema[K]>(
    type: K,
    key: string,
    item: T,
    sourceOrOptions?: string | Record<string, any>,
    optionsArg?: Record<string, any>,
  ) => RegistrationHandle<T>;
  subscribe: <K extends RegistryTypeKey = RegistryTypeKey>(
    type: K,
    key: string | null | undefined,
    listener: () => void,
  ) => () => void;
  transaction: (
    executor: (tx: { register: any; unregister: any }) => void,
    metadata?: Record<string, any>,
  ) => any;
  unregister: <K extends RegistryTypeKey = RegistryTypeKey>(
    type: K,
    key: string,
    sourceOrOptions?: string | Record<string, any>,
  ) => void;
}

export interface RegistryScope {
  id: string;
  kind: string;
  parent: string | null;
}

export interface PageBackgroundVideoOptions {
  autoplay?: boolean;
  codec?: "auto" | "hevc" | "av1" | "h264" | "vp9";
  corp?: number;
  endTime?: number;
  fit?: string;
  forceIframe?: boolean;
  loop?: boolean;
  muted?: boolean;
  objectFit?: string;
  playbackRate?: number;
  quality?:
    | "auto"
    | "2160p"
    | "1440p"
    | "1080p"
    | "720p"
    | "480p"
    | "360p";
  showPoster?: boolean;
  showSpinner?: boolean;
  startTime?: number;
  width?: string | number | null;
}

export interface PageBackgroundConfig {
  blur?: number;
  color?: string;
  fadeEdges?: {
    bottom?: number;
    left?: number;
    right?: number;
    top?: number;
  };
  glow?: boolean | { color?: string; opacity?: number };
  gradient?: string;
  image?: string;
  noise?: boolean;
  noiseStyle?: { opacity?: number };
  overlay?: boolean;
  overlayOpacity?: number;
  video?: string;
  videoOptions?: PageBackgroundVideoOptions;
  width?: string | number;
  youtube?: string;
  [key: string]: any;
}

export interface PageGuardConfig {
  message?: string;
  onBlock?: (info: any) => void;
  when: boolean;
}

export interface PageLoadingConfig {
  isLoading?: boolean;
  message?: string;
  [key: string]: any;
}

export interface PageAmbientConfig {
  image?: string | null;
  tintGlobals?: boolean;
  [key: string]: any;
}

export interface PageOptions {
  instanceId?: string;
  lifecycle?: RegistryLifecycle;
  priority?: number;
  scope?: string;
  source?: string;
  [key: string]: any;
}

export interface PageToastConfig {
  duration?: number | null;
  [key: string]: unknown;
}

export interface PageToastContract {
  (message: any, options?: number | Record<string, any>): any;
  dismiss: (id?: string) => void;
  dismissAll: () => void;
  fromResult: <T = any, E = any>(
    result: any,
    messages?: Record<string, any>,
    options?: number | Record<string, any>,
  ) => any;
  promise: <T = any>(
    promise: Promise<T> | (() => Promise<T>),
    messages?: Record<string, any>,
    options?: number | Record<string, any>,
  ) => Promise<T>;
}

export interface PageDockConfig {
  actions?: any[];
  banner?: string;
  bannerOpacity?: number | null;
  bannerPosition?: string | null;
  bannerRepeat?: string | null;
  bannerSize?: string | null;
  bannerUrl?: string | null;
  description?: ReactNode;
  icon?: any;
  dockPolicy?: Record<string, any>;
  path?: string;
  style?: Record<string, unknown>;
  title?: ReactNode;
  [key: string]: unknown;
}

export type PageSurfaceSlot =
  | Record<string, any>
  | ComponentType<any>
  | ((props: Record<string, any>) => any);

/**
 * Extensible page configuration contract.
 * Domain features and custom modules can augment this interface via:
 * `declare module "@/core/orchestration" { interface PageConfig { ... } }`
 */
export interface PageConfig {
  actions?: any[];
  ambient?: boolean | string | PageAmbientConfig;
  background?: string | PageBackgroundConfig | Record<string, any>;
  banner?: string;
  bannerOpacity?: number;
  bannerPosition?: string;
  bannerRepeat?: string;
  bannerSize?: string;
  bannerUrl?: string;
  breadcrumbs?: any[];
  contextMenu?: Record<string, any> | null;
  controls?: Record<string, any> | null;
  description?: string;
  guard?: PageGuardConfig;
  icon?: any;
  loading?: boolean | string | PageLoadingConfig;
  modal?: any;
  modals?: Record<string, any>;
  dock?: PageDockConfig | null;
  path?: string;
  surfaces?: Record<string, PageSurfaceSlot>;
  title?: string;
  toast?: number | PageToastConfig;
  [key: string]: unknown;
}

export interface PageController {
  Provider: ({ children }: { children?: ReactNode }) => ReactNode;
  background: {
    set: (bg: string | PageBackgroundConfig | Record<string, any>) => void;
    setVideoPlaying: (playing: boolean) => void;
    toggleMute: () => void;
    toggleVideo: () => void;
  };
  closeAllModals: () => void;
  closeAllSurfaces: () => void;
  closeModal: (id: string | number) => void;
  closeSurface: (id?: string) => void;
  config: PageConfig;
  modal: (
    idOrDef: any,
    props?: Record<string, unknown>,
  ) => Promise<unknown>;
  modals: Record<string, any>;
  reset: () => void;
  set: (partial: Partial<PageConfig>) => void;
  setActions: (actions: any[]) => void;
  setAmbient: (ambient: boolean | string | PageAmbientConfig) => void;
  setBackground: (
    background: string | PageBackgroundConfig | Record<string, any>,
  ) => void;
  setBanner: (banner: string) => void;
  setControls: (controls: any) => void;
  setDescription: (description: string) => void;
  setIcon: (icon: any) => void;
  setLoading: (loading: boolean | string | PageLoadingConfig) => void;
  setDock: (dockConfig: PageDockConfig) => void;
  setTitle: (title: string) => void;
  surface: (
    idOrDef: PageSurfaceSlot | string,
    props?: Record<string, unknown>,
  ) => unknown;
  surfaces: Record<string, PageSurfaceSlot>;
  toast: PageToastContract;
}

