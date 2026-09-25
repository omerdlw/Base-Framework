import {
  DEFAULT_SOURCE,
  getRegistryDefinition,
  REGISTRY_KEYS,
  REGISTRY_LIFECYCLES,
  REGISTRY_TYPES,
  normalizeRegistryMetadata,
  validateControlsConfig,
  validateDockConfig,
  validateRegistryMetadata,
} from "./schema";
import { isObject } from "./utils";

function isPersistentLifecycle(lifecycle: any): boolean {
  return lifecycle === REGISTRY_LIFECYCLES.PERSISTENT;
}

function runRegistrationBatch(
  context: any,
  executor: (queue: any) => void,
): any {
  return typeof context.batch === "function"
    ? context.batch(executor)
    : executor(context);
}

function splitRegistryConfig(
  config: any,
  options: Record<string, any> = {},
): any {
  const definition: any = getRegistryDefinition(options.type) || {};
  const {
    defaultCleanupDelayMs = definition.defaultCleanupDelayMs ?? null,
    defaultLifecycle = definition.defaultLifecycle ?? null,
    defaultSource = DEFAULT_SOURCE,
  } = options;

  const registryMeta =
    isObject(config) && isObject(config.registry) ? config.registry : {};

  const { cleanupDelayMs, lifecycle, registerOptions, scope, source } =
    normalizeRegistryMetadata(registryMeta, {
      defaultCleanupDelayMs,
      defaultLifecycle,
      defaultSource,
    });

  const payload = isObject(config)
    ? Object.fromEntries(
        Object.entries(config).filter(([key]) => key !== "registry"),
      )
    : config;

  const metadataValidation = validateRegistryMetadata(registryMeta);
  const metadataIsStrict = registryMeta.validation === "strict";

  return {
    cleanupDelayMs,
    lifecycle,
    metadataInvalid: !metadataValidation.valid,
    metadataIsStrict,
    payload,
    registerOptions,
    scope,
    source,
  };
}

function createCleanupKey(
  path: string,
  source: string,
  instanceId: string | null = null,
  scope: string | null = null,
): string {
  return JSON.stringify([path, scope, source, instanceId || null]);
}

function createScopedCleanupKey(
  source: string,
  instanceId: string | null = null,
  scope: string | null = null,
): string {
  return JSON.stringify([scope, source, instanceId || null]);
}

function getCleanupScope(context: any): Map<string, any> {
  return context?.cleanupScope || new Map();
}

function clearCleanupTimer(scope: Map<string, any>, cleanupKey: string): void {
  const lifecycle = scope.get(cleanupKey);
  if (!lifecycle) return;
  lifecycle.cancelled = true;
  clearTimeout(lifecycle.timerId);
  scope.delete(cleanupKey);
}

function scheduleCleanup(
  scope: Map<string, any>,
  cleanupKey: string,
  callback: () => void,
  delayMs: number,
): void {
  clearCleanupTimer(scope, cleanupKey);
  const lifecycle: { cancelled: boolean; timerId: any } = {
    cancelled: false,
    timerId: null,
  };

  lifecycle.timerId = setTimeout(() => {
    if (lifecycle.cancelled || scope.get(cleanupKey) !== lifecycle) return;
    scope.delete(cleanupKey);
    callback();
  }, delayMs);

  scope.set(cleanupKey, lifecycle);
}

function scheduleOrRunCleanup(
  scope: Map<string, any>,
  cleanupKey: string,
  callback: () => void,
  delayMs: number | null | undefined,
): void {
  if (typeof delayMs === "number" && Number.isFinite(delayMs) && delayMs > 0) {
    scheduleCleanup(scope, cleanupKey, callback, delayMs);
  } else {
    callback();
  }
}

function processArrayRegistrations({
  configArray,
  type,
  context,
  validatePayload,
  mapPayloadToEntry,
}: {
  configArray: any;
  type: string;
  context: any;
  validatePayload?: (payload: any) => { valid: boolean; issues: string[] };
  mapPayloadToEntry: (payload: any, context: any, registerOptions: any) => any;
}): any {
  const items = Array.isArray(configArray)
    ? configArray
    : configArray
      ? [configArray]
      : [];
  if (items.length === 0) return;

  const registrations = items.flatMap((itemConfig: any) => {
    const {
      cleanupDelayMs,
      lifecycle,
      metadataInvalid,
      metadataIsStrict,
      payload,
      registerOptions,
      scope,
      source,
    } = splitRegistryConfig(itemConfig, { type });

    if (metadataInvalid && metadataIsStrict) return [];

    if (validatePayload) {
      const validation = validatePayload(payload);
      if (!validation.valid) {
        console.warn(`[Registry] Invalid ${type} config:`, validation.issues);
        return [];
      }
    }

    return [
      {
        cleanupDelayMs,
        lifecycle,
        scope,
        source,
        registerOptions,
        ...mapPayloadToEntry(payload, context, registerOptions),
      },
    ];
  });

  return applyRegistrationEntries(type, registrations, context);
}

function applySingleRegistration({
  configBlock,
  type,
  key,
  context,
  useScopedCleanupKey = false,
}: {
  configBlock: any;
  type: string;
  key: string;
  context: any;
  useScopedCleanupKey?: boolean;
}): any {
  if (!configBlock) return;

  const { instanceId, register, unregister } = context;
  const cleanupScope = getCleanupScope(context);

  const {
    cleanupDelayMs,
    lifecycle,
    metadataInvalid,
    metadataIsStrict,
    payload,
    registerOptions,
    scope,
    source,
  } = splitRegistryConfig(configBlock, { type });

  if (metadataInvalid && metadataIsStrict) return;

  const cleanupKey = useScopedCleanupKey
    ? createScopedCleanupKey(source, instanceId, scope)
    : createCleanupKey(key, source, instanceId, scope);

  clearCleanupTimer(cleanupScope, cleanupKey);
  register(type, key, payload, source, registerOptions);

  return () => {
    if (isPersistentLifecycle(lifecycle)) return;
    scheduleOrRunCleanup(
      cleanupScope,
      cleanupKey,
      () => unregister(type, key, { source, instanceId, scope }),
      cleanupDelayMs,
    );
  };
}

function applyRegistrationEntries(
  type: string,
  registrations: any[],
  context: any,
): any {
  if (registrations.length === 0) return;
  const { instanceId, unregister } = context;
  const cleanupScope = getCleanupScope(context);

  runRegistrationBatch(context, (queue: any) => {
    registrations.forEach(({ key, registerOptions, scope, source, value }) => {
      clearCleanupTimer(
        cleanupScope,
        createCleanupKey(key, source, instanceId, scope),
      );
      queue.register(type, key, value, source, registerOptions);
    });
  });

  return () => {
    registrations.forEach(
      ({ cleanupDelayMs, key, lifecycle, scope, source }) => {
        if (isPersistentLifecycle(lifecycle)) return;
        scheduleOrRunCleanup(
          cleanupScope,
          createCleanupKey(key, source, instanceId, scope),
          () => unregister(type, key, { source, instanceId, scope }),
          cleanupDelayMs,
        );
      },
    );
  };
}

const backgroundHandler = {
  name: "background",
  apply: (config: any, context: any) =>
    applySingleRegistration({
      configBlock: config?.background,
      type: REGISTRY_TYPES.BACKGROUND,
      key: REGISTRY_KEYS.BACKGROUND,
      context,
    }),
};

const loadingHandler = {
  name: "loading",
  apply: (config: any, context: any) =>
    applySingleRegistration({
      configBlock: config?.loading,
      type: REGISTRY_TYPES.LOADING,
      key: REGISTRY_KEYS.LOADING,
      context,
      useScopedCleanupKey: true,
    }),
};

const contextMenuHandler = {
  name: "contextMenu",
  apply: (config: any, context: any) =>
    applySingleRegistration({
      configBlock: config?.contextMenu,
      type: REGISTRY_TYPES.CONTEXT_MENU,
      key: context.pathname || REGISTRY_KEYS.CONTEXT_MENU_CURRENT,
      context,
    }),
};

function normalizeControlsConfig(rawControls: any): any {
  if (!rawControls) return null;
  if (Array.isArray(rawControls)) return rawControls;
  if (
    isObject(rawControls) &&
    !rawControls.side &&
    ("left" in rawControls || "right" in rawControls)
  ) {
    const {
      id = "controls",
      left,
      order = 0,
      path,
      registry,
      right,
      ...rest
    } = rawControls;
    const entries: any[] = [];
    if (left != null && left !== false) {
      entries.push({
        ...rest,
        ...(registry ? { registry } : {}),
        content: left,
        id: `${id}-left`,
        order,
        ...(path ? { path } : {}),
        side: "left",
      });
    }
    if (right != null && right !== false) {
      entries.push({
        ...rest,
        ...(registry ? { registry } : {}),
        content: right,
        id: `${id}-right`,
        order,
        ...(path ? { path } : {}),
        side: "right",
      });
    }
    return entries;
  }
  return rawControls;
}

const controlsHandler = {
  name: "controls",
  apply: (config: any, context: any) =>
    processArrayRegistrations({
      configArray: normalizeControlsConfig(config?.controls),
      type: REGISTRY_TYPES.CONTROLS,
      context,
      validatePayload: validateControlsConfig,
      mapPayloadToEntry: (payload: any, ctx: any) => ({
        key: `${ctx.pathname || "/"}::${payload.id}`,
        value: { ...payload, path: ctx.pathname || "/" },
      }),
    }),
};

function getLoadingFallback(config: any): any {
  const loading = config?.loading;
  if (!isObject(loading)) return undefined;

  const { payload } = splitRegistryConfig(loading);
  if (
    !isObject(payload) ||
    !Object.prototype.hasOwnProperty.call(payload, "isLoading")
  )
    return undefined;

  return payload.isLoading;
}

const dockHandler = {
  name: "dock",
  apply: (config: any, context: any) => {
    const { instanceId, register, unregister, pathname } = context;
    const cleanupScope = getCleanupScope(context);
    const dock = config?.dock;
    if (!dock) return;

    const {
      cleanupDelayMs,
      lifecycle,
      metadataInvalid,
      metadataIsStrict,
      payload,
      registerOptions,
      scope,
      source,
    } = splitRegistryConfig(dock, { type: REGISTRY_TYPES.DOCK });

    if (metadataInvalid && metadataIsStrict) return;

    const dockConfig = isObject(payload) ? payload : {};
    const normalizedDockConfig = { ...dockConfig };
    delete normalizedDockConfig.confirmation;

    const itemPath = normalizedDockConfig.path || pathname;
    if (!itemPath) return;

    const dockItem: any = {
      ...normalizedDockConfig,
      path: itemPath,
      action: normalizedDockConfig.action,
      actions: normalizedDockConfig.actions,
      surface: normalizedDockConfig.surface,
    };

    const validation = validateDockConfig(dockItem);
    if (!validation.valid) {
      console.warn("[Registry] Invalid DOCK config:", validation.issues);
      return;
    }

    const resolvedIsLoading =
      normalizedDockConfig.isLoading !== undefined
        ? normalizedDockConfig.isLoading
        : getLoadingFallback(config);

    if (resolvedIsLoading !== undefined) {
      dockItem.isLoading = resolvedIsLoading;
    }

    const filteredDockItem = Object.fromEntries(
      Object.entries(dockItem).filter(([, val]) => val !== undefined),
    );

    const cleanupKey = createCleanupKey(itemPath, source, instanceId, scope);
    clearCleanupTimer(cleanupScope, cleanupKey);
    register(
      REGISTRY_TYPES.DOCK,
      itemPath,
      filteredDockItem,
      source,
      registerOptions,
    );

    return () => {
      if (isPersistentLifecycle(lifecycle)) return;
      scheduleOrRunCleanup(
        cleanupScope,
        cleanupKey,
        () =>
          unregister(REGISTRY_TYPES.DOCK, itemPath, {
            source,
            instanceId,
            scope,
          }),
        cleanupDelayMs,
      );
    };
  },
};

const modalHandler = {
  name: "modals",
  apply: (config: any, context: any) => {
    const modals = config?.modal || config?.modals;
    if (!modals) return;

    const modalConfig = Array.isArray(modals)
      ? Object.assign({}, ...modals)
      : modals;

    const {
      cleanupDelayMs,
      lifecycle,
      metadataInvalid,
      metadataIsStrict,
      payload,
      registerOptions,
      scope,
      source,
    } = splitRegistryConfig(modalConfig, { type: REGISTRY_TYPES.MODAL });

    if (metadataInvalid && metadataIsStrict) return;

    const modalItems = Object.entries(isObject(payload) ? payload : {}).filter(
      ([key]) => key !== "registry",
    );
    if (modalItems.length === 0) return;

    const { instanceId } = context;
    const cleanupScope = getCleanupScope(context);
    const cleanupKey = createCleanupKey("modals", source, instanceId, scope);

    clearCleanupTimer(cleanupScope, cleanupKey);

    runRegistrationBatch(context, (queue: any) => {
      modalItems.forEach(([key, component]) => {
        queue.register(
          REGISTRY_TYPES.MODAL,
          key,
          component,
          source,
          registerOptions,
        );
      });
    });

    return () => {
      if (isPersistentLifecycle(lifecycle)) return;
      scheduleOrRunCleanup(
        cleanupScope,
        cleanupKey,
        () =>
          runRegistrationBatch(context, (queue: any) => {
            modalItems.forEach(([key]) => {
              queue.unregister(REGISTRY_TYPES.MODAL, key, {
                source,
                instanceId,
                scope,
              });
            });
          }),
        cleanupDelayMs,
      );
    };
  },
};

const titleHandler = {
  name: "title",
  apply: (config: any) => {
    const title = config?.title;
    if (!title || typeof document === "undefined") return;

    const originalTitle = document.title;
    document.title = title;

    return () => {
      if (typeof document !== "undefined") {
        document.title = originalTitle;
      }
    };
  },
};

export interface RegistryConfigHandler {
  name: string;
  apply: (config: any, context: any) => (() => void) | void;
}

const REGISTRY_HANDLERS: RegistryConfigHandler[] = [
  titleHandler,
  contextMenuHandler,
  controlsHandler,
  dockHandler,
  modalHandler,
  backgroundHandler,
  loadingHandler,
];

export function registerRegistryHandler(
  handler: RegistryConfigHandler,
): () => void {
  if (!handler || typeof handler.name !== "string" || typeof handler.apply !== "function") {
    return () => {};
  }
  const existingIndex = REGISTRY_HANDLERS.findIndex((h) => h.name === handler.name);
  if (existingIndex >= 0) {
    REGISTRY_HANDLERS[existingIndex] = handler;
  } else {
    REGISTRY_HANDLERS.push(handler);
  }
  return () => {
    const idx = REGISTRY_HANDLERS.indexOf(handler);
    if (idx >= 0) REGISTRY_HANDLERS.splice(idx, 1);
  };
}

export function applyRegistryConfig(config: any, context: any): () => void {
  if (!config) return () => {};

  const cleanups = REGISTRY_HANDLERS.map((handler) => {
    try {
      return handler.apply(config, context);
    } catch (error: any) {
      console.error(`[Registry] Failed to apply ${handler.name}:`, error);
      return null;
    }
  });

  return () => {
    cleanups.forEach((cleanup) => {
      if (typeof cleanup !== "function") return;
      try {
        cleanup();
      } catch (error: any) {
        console.error("[Registry] Failed to clean up registration:", error);
      }
    });
  };
}
