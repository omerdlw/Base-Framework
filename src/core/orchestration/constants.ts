import type {
  RegistryDefinition,
  RegistryLifecycle,
  RegistryScopeKind,
  RegistrySource,
  RegistryType,
  RegistryValidationMode,
} from "./types";

export const REGISTRY_TYPES: Readonly<Record<string, RegistryType>> =
  Object.freeze({
    CONTEXT_MENU: "CONTEXT_MENU",
    BACKGROUND: "BACKGROUND",
    CONTROLS: "CONTROLS",
    LOADING: "LOADING",
    MODAL: "MODAL",
    NAV: "NAV",
  });

export const REGISTRY_KEYS = Object.freeze({
  CONTEXT_MENU_CURRENT: "current-page",
  BACKGROUND: "page-background",
  LOADING: "page-loading",
});

export const DEFAULT_SOURCE: RegistrySource = "dynamic";
export const DYNAMIC_SOURCE: RegistrySource = DEFAULT_SOURCE;

export const REGISTRY_SOURCES: Readonly<Record<string, RegistrySource>> =
  Object.freeze({
    STATIC: "static",
    DYNAMIC: "dynamic",
    USER: "user",
  });

export const REGISTRY_LIFECYCLES: Readonly<Record<string, RegistryLifecycle>> =
  Object.freeze({
    IMMEDIATE: "immediate",
    GRACEFUL: "graceful",
    PERSISTENT: "persistent",
    ROUTE: "route",
  });

export const REGISTRY_VALIDATION_MODES: Readonly<
  Record<string, RegistryValidationMode>
> = Object.freeze({
  WARN: "warn",
  STRICT: "strict",
});

export const REGISTRY_METADATA_KEYS: readonly string[] = Object.freeze([
  "cleanup",
  "cleanupDelayMs",
  "instanceId",
  "lifecycle",
  "priority",
  "source",
  "scope",
  "validation",
]);

export const REGISTRY_RESOLVERS: Readonly<Record<string, string>> =
  Object.freeze({
    [REGISTRY_TYPES.NAV]: "merge",
  });

export const REGISTRY_DEFINITIONS: Readonly<
  Record<string, RegistryDefinition>
> = Object.freeze({
  [REGISTRY_TYPES.CONTEXT_MENU]: Object.freeze({
    defaultCleanupDelayMs: 600,
    defaultLifecycle: REGISTRY_LIFECYCLES.IMMEDIATE,
    keyPolicy: "route",
    resolver: "priority",
    valueKind: "object",
  }),
  [REGISTRY_TYPES.BACKGROUND]: Object.freeze({
    defaultCleanupDelayMs: 600,
    defaultLifecycle: REGISTRY_LIFECYCLES.IMMEDIATE,
    keyPolicy: "singleton",
    resolver: "priority",
    valueKind: "object",
  }),
  [REGISTRY_TYPES.CONTROLS]: Object.freeze({
    defaultCleanupDelayMs: null,
    defaultLifecycle: REGISTRY_LIFECYCLES.IMMEDIATE,
    keyPolicy: "named",
    resolver: "priority",
    valueKind: "object",
  }),
  [REGISTRY_TYPES.LOADING]: Object.freeze({
    defaultCleanupDelayMs: 600,
    defaultLifecycle: REGISTRY_LIFECYCLES.GRACEFUL,
    keyPolicy: "singleton",
    resolver: "priority",
    valueKind: "object",
  }),
  [REGISTRY_TYPES.MODAL]: Object.freeze({
    defaultCleanupDelayMs: 600,
    defaultLifecycle: REGISTRY_LIFECYCLES.IMMEDIATE,
    keyPolicy: "named",
    resolver: "priority",
    valueKind: "component",
  }),
  [REGISTRY_TYPES.NAV]: Object.freeze({
    defaultCleanupDelayMs: 600,
    defaultLifecycle: REGISTRY_LIFECYCLES.ROUTE,
    keyPolicy: "path",
    resolver: "merge",
    valueKind: "object",
  }),
});

export const REGISTRY_SOURCE_PRIORITY: Readonly<Record<string, number>> =
  Object.freeze({
    [REGISTRY_SOURCES.STATIC]: 100,
    [REGISTRY_SOURCES.DYNAMIC]: 200,
    [REGISTRY_SOURCES.USER]: 300,
  });

export const REGISTRY_SOURCE_RANK: Readonly<Record<string, number>> =
  Object.freeze({
    [REGISTRY_SOURCES.STATIC]: 10,
    [REGISTRY_SOURCES.DYNAMIC]: 20,
    [REGISTRY_SOURCES.USER]: 30,
  });

export const REGISTRY_FEATURE_KEYS: ReadonlySet<string> = new Set([
  "background",
  "controls",
  "contextMenu",
  "loading",
  "modal",
  "modals",
  "nav",
]);

export const REGISTRY_LIFECYCLE_VALUES: ReadonlySet<string> = new Set(
  Object.values(REGISTRY_LIFECYCLES),
);

export const REGISTRY_ROUTE_KEYS: ReadonlySet<string> = new Set([
  REGISTRY_KEYS.CONTEXT_MENU_CURRENT,
  "*",
]);

export const REGISTRY_METADATA_KEY_SET: ReadonlySet<string> = new Set(
  REGISTRY_METADATA_KEYS,
);

export const CONTROL_SIDES: ReadonlySet<string> = new Set(["left", "right"]);

export const VALID_PRIMITIVE_TYPES: ReadonlySet<string> = new Set([
  "boolean",
  "string",
  "number",
]);

export const REGISTRY_SINGLETON_KEYS: Readonly<Record<string, string>> =
  Object.freeze({
    [REGISTRY_TYPES.BACKGROUND]: REGISTRY_KEYS.BACKGROUND,
    [REGISTRY_TYPES.LOADING]: REGISTRY_KEYS.LOADING,
  });

export const NAV_CONFIG_FIELD_TYPES: Readonly<Record<string, string>> =
  Object.freeze({
    expandHorizontal: "boolean",
    dismissible: "boolean",
    isOverlay: "boolean",
    isLoading: "boolean",
    width: "number",
    path: "string",
    name: "string",
    targetPath: "string",
    banner: "any",
    bannerUrl: "string",
    bannerPosition: "string",
    bannerSize: "string",
    bannerOpacity: "number",
    bannerRepeat: "string",
  });

export const NAVIGATION_POLICY_FIELD_TYPES: Readonly<Record<string, string>> =
  Object.freeze({
    clearTransientState: "boolean",
    dismissSurfaces: "boolean",
    prefetch: "boolean",
  });

export const REGISTRY_SCOPE_KINDS: Readonly<Record<string, RegistryScopeKind>> =
  Object.freeze({
    APP: "app",
    SESSION: "session",
    ROUTE: "route",
    INSTANCE: "instance",
    WORKSPACE: "workspace",
  });

export const DEFAULT_REGISTRY_SCOPE: RegistryScopeKind =
  REGISTRY_SCOPE_KINDS.APP;

export const MAX_DIAGNOSTICS = 200;
