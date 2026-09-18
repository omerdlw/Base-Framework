import type { ReactNode } from "react";

export type RegistryType =
  | "CONTEXT_MENU"
  | "BACKGROUND"
  | "CONTROLS"
  | "LOADING"
  | "MODAL"
  | "NAV"
  | string;

export interface AppRegistryEntry<T = any> {
  type: string;
  items: Record<string, T>;
}

export type RegistrySource = "static" | "dynamic" | "user" | string;

export type RegistryLifecycle =
  "immediate" | "graceful" | "persistent" | "route" | string;

export type RegistryValidationMode = "warn" | "strict";

export type RegistryScopeKind =
  "app" | "session" | "route" | "instance" | "workspace" | string;

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

export interface RegistryQueue {
  register: <T = any>(
    type: string,
    key: string,
    item: T,
    sourceOrOptions?: string | Record<string, any>,
    optionsArg?: Record<string, any>,
  ) => RegistrationHandle<T>;
  unregister: (
    type: string,
    key: string,
    sourceOrOptions?: string | Record<string, any>,
  ) => void;
}

export interface RegistryStore {
  batch: (executor: (queue: RegistryQueue) => void) => number;
  dispose: (operation: any, reason?: string) => boolean;
  getEntriesSnapshot: <T = any>(
    type: string,
    scope?: string | null,
  ) => Record<string, T>;
  getSnapshot: <T = any>(
    type: string,
    key: string,
    scope?: string | null,
  ) => T | undefined;
  isCurrent: (operation: any) => boolean;
  register: <T = any>(
    type: string,
    key: string,
    item: T,
    sourceOrOptions?: string | Record<string, any>,
    optionsArg?: Record<string, any>,
  ) => RegistrationHandle<T>;
  subscribe: (
    type: string,
    key: string | null | undefined,
    listener: () => void,
  ) => () => void;
  transaction: (
    executor: (tx: { register: any; unregister: any }) => void,
    metadata?: Record<string, any>,
  ) => any;
  unregister: (
    type: string,
    key: string,
    sourceOrOptions?: string | Record<string, any>,
  ) => void;
}

export interface RegistryScope {
  id: string;
  kind: string;
  parent: string | null;
}

export interface RegistryDiagnostic {
  action: string;
  timestamp?: number;
  [key: string]: any;
}

export interface PageBackgroundVideoOptions {
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playbackRate?: number;
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
  preset?: string;
  video?: string;
  videoOptions?: PageBackgroundVideoOptions;
  width?: string | number;
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

export interface PageConfig {
  actions?: any[];
  ambient?: boolean | string | PageAmbientConfig;
  auth?:
    | boolean
    | {
        enabled?: boolean;
        openSignIn?: boolean;
        [key: string]: any;
      };
  background?: string | PageBackgroundConfig;
  banner?: string;
  bannerOpacity?: number;
  bannerPosition?: string;
  bannerRepeat?: string;
  bannerSize?: string;
  bannerUrl?: string;
  breadcrumbs?: any[];
  contextMenu?: any;
  controls?: any;
  description?: string;
  guard?: PageGuardConfig;
  icon?: any;
  loading?: boolean | string | PageLoadingConfig;
  modal?: any;
  modals?: Record<string, any>;
  nav?: any;
  path?: string;
  surfaces?: Record<string, any>;
  title?: string;
  [key: string]: any;
}

export interface PageController {
  Provider: ({ children }: { children?: ReactNode }) => ReactNode;
  background: {
    set: (bg: any) => void;
    setVideoPlaying: (playing: boolean) => void;
    toggleMute: () => void;
    toggleVideo: () => void;
  };
  closeAllModals: () => void;
  closeAllSurfaces: () => void;
  closeModal: (id: string) => void;
  closeSurface: (id: string) => void;
  config: PageConfig;
  modal: (idOrDef: any, props?: Record<string, any>) => any;
  modals: Record<string, any>;
  reset: () => void;
  set: (partial: Partial<PageConfig>) => void;
  setActions: (actions: any[]) => void;
  setAmbient: (ambient: any) => void;
  setBackground: (background: any) => void;
  setBanner: (banner: any) => void;
  setControls: (controls: any) => void;
  setDescription: (description: any) => void;
  setIcon: (icon: any) => void;
  setLoading: (loading: any) => void;
  setNav: (navConfig: any) => void;
  setTitle: (title: any) => void;
  surface: (idOrDef: any, props?: Record<string, any>) => any;
  surfaces: Record<string, any>;
  toast: any;
}
