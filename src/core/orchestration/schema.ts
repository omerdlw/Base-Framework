import { isValidElement } from "react";
import {
  CONTROL_SIDES,
  DEFAULT_SOURCE,
  DYNAMIC_SOURCE,
  DOCK_CONFIG_FIELD_TYPES,
  DOCK_POLICY_FIELD_TYPES,
  REGISTRY_DEFINITIONS,
  REGISTRY_FEATURE_KEYS,
  REGISTRY_KEYS,
  REGISTRY_LIFECYCLE_VALUES,
  REGISTRY_LIFECYCLES,
  REGISTRY_METADATA_KEY_SET,
  REGISTRY_METADATA_KEYS,
  REGISTRY_RESOLVERS,
  REGISTRY_ROUTE_KEYS,
  REGISTRY_SINGLETON_KEYS,
  REGISTRY_SOURCE_PRIORITY,
  REGISTRY_SOURCE_RANK,
  REGISTRY_SOURCES,
  REGISTRY_TYPES,
  REGISTRY_VALIDATION_MODES,
  VALID_PRIMITIVE_TYPES,
} from "./constants";
import {
  getCustomRegistryValidator,
  getRegistryDefinition,
  getValidString,
  isObject,
  isPlainObject,
  parseFiniteNumber,
} from "./utils";
import type { ValidationResult } from "./types";

export {
  DEFAULT_SOURCE,
  DYNAMIC_SOURCE,
  REGISTRY_DEFINITIONS,
  REGISTRY_KEYS,
  REGISTRY_LIFECYCLES,
  REGISTRY_RESOLVERS,
  REGISTRY_SOURCE_PRIORITY,
  REGISTRY_SOURCE_RANK,
  REGISTRY_SOURCES,
  REGISTRY_TYPES,
  REGISTRY_VALIDATION_MODES,
  getRegistryDefinition,
};

function resolveLifecycle(metadata: any, fallback: any): any {
  const lifecycle = metadata?.lifecycle ?? metadata?.cleanup;
  return REGISTRY_LIFECYCLE_VALUES.has(lifecycle) ? lifecycle : fallback;
}

function isRenderableValue(value: any): boolean {
  if (
    value === null ||
    value === undefined ||
    VALID_PRIMITIVE_TYPES.has(typeof value) ||
    isValidElement(value)
  ) {
    return true;
  }
  return Array.isArray(value) && value.every(isRenderableValue);
}

export function validateRegistryMetadata(metadata: any): ValidationResult {
  if (metadata === undefined || metadata === null)
    return { issues: [], valid: true };
  if (!isObject(metadata))
    return { issues: ["registry metadata must be an object"], valid: false };

  const issues: string[] = [];

  Object.keys(metadata).forEach((key) => {
    if (!REGISTRY_METADATA_KEY_SET.has(key))
      issues.push(`unknown registry metadata field: ${key}`);
  });

  if (metadata.source !== undefined && !getValidString(metadata.source))
    issues.push("source must be a non-empty string");
  if (metadata.instanceId !== undefined && !getValidString(metadata.instanceId))
    issues.push("instanceId must be a non-empty string");
  if (metadata.scope !== undefined && !getValidString(metadata.scope))
    issues.push("scope must be a non-empty string");
  if (
    metadata.priority !== undefined &&
    parseFiniteNumber(metadata.priority) === null
  )
    issues.push("priority must be a finite number");

  if (metadata.cleanupDelayMs !== undefined) {
    const delay = parseFiniteNumber(metadata.cleanupDelayMs);
    if (delay === null || delay < 0)
      issues.push("cleanupDelayMs must be a non-negative finite number");
  }

  const lifecycle = metadata.lifecycle ?? metadata.cleanup;
  if (lifecycle !== undefined && !REGISTRY_LIFECYCLE_VALUES.has(lifecycle)) {
    issues.push(
      `lifecycle must be one of: ${[...REGISTRY_LIFECYCLE_VALUES].join(", ")}`,
    );
  }

  if (
    metadata.validation !== undefined &&
    !Object.values(REGISTRY_VALIDATION_MODES).includes(metadata.validation)
  ) {
    issues.push(
      `validation must be one of: ${Object.values(REGISTRY_VALIDATION_MODES).join(", ")}`,
    );
  }

  return { issues, valid: issues.length === 0 };
}

export function validateDockConfig(config: any): ValidationResult {
  const issues: string[] = [];
  if (!isPlainObject(config))
    return { valid: false, issues: ["DOCK config must be a plain object"] };

  Object.entries(DOCK_CONFIG_FIELD_TYPES).forEach(([field, expectedType]) => {
    if (
      config[field] !== undefined &&
      config[field] !== null &&
      typeof config[field] !== expectedType
    ) {
      issues.push(`DOCK.${field} must be a ${expectedType}`);
    }
  });

  ["title", "description"].forEach((field) => {
    if (
      config[field] !== undefined &&
      config[field] !== null &&
      !isRenderableValue(config[field])
    ) {
      issues.push(`DOCK.${field} must be a renderable value`);
    }
  });

  if (config.path !== undefined && !String(config.path).startsWith("/"))
    issues.push("DOCK.path must start with /");
  if (config.actions !== undefined && !Array.isArray(config.actions))
    issues.push("DOCK.actions must be an array");
  if (config.style !== undefined && !isPlainObject(config.style))
    issues.push("DOCK.style must be a plain object");

  if (config.dockPolicy !== undefined) {
    if (!isPlainObject(config.dockPolicy)) {
      issues.push("DOCK.dockPolicy must be a plain object");
    } else {
      Object.entries(DOCK_POLICY_FIELD_TYPES).forEach(
        ([field, expectedType]) => {
          const val = config.dockPolicy[field];
          if (val !== undefined && typeof val !== expectedType)
            issues.push(
              `DOCK.dockPolicy.${field} must be a ${expectedType}`,
            );
        },
      );
    }
  }

  return { valid: issues.length === 0, issues };
}

export function validateControlsConfig(config: any): ValidationResult {
  const issues: string[] = [];
  if (!isPlainObject(config))
    return { issues: ["CONTROLS config must be a plain object"], valid: false };
  if (!getValidString(config.id))
    issues.push("CONTROLS.id must be a non-empty string");
  if (!CONTROL_SIDES.has(config.side))
    issues.push("CONTROLS.side must be left or right");
  if (
    config.content === undefined ||
    config.content === null ||
    config.content === false ||
    !isRenderableValue(config.content)
  ) {
    issues.push("CONTROLS.content must be renderable");
  }
  if (!Number.isFinite(Number(config.order)))
    issues.push("CONTROLS.order must be a finite number");

  return { issues, valid: issues.length === 0 };
}

export function validateRegistryKey(type: string, key: any): ValidationResult {
  const definition = getRegistryDefinition(type);
  const issues: string[] = [];

  if (!definition) issues.push(`unknown registry type: ${String(type)}`);
  if (!getValidString(key))
    return {
      issues: [...issues, "key must be a non-empty string"],
      valid: false,
    };

  const normalizedKey = String(key).trim();

  if (definition?.keyPolicy === "singleton") {
    const expectedKey = REGISTRY_SINGLETON_KEYS[type];
    if (expectedKey && normalizedKey !== expectedKey)
      issues.push(`${type} key must be ${expectedKey}`);
  } else if (definition?.keyPolicy === "path") {
    if (!normalizedKey.startsWith("/"))
      issues.push(`${type} key must be an absolute path`);
  } else if (definition?.keyPolicy === "route") {
    if (
      !normalizedKey.startsWith("/") &&
      !REGISTRY_ROUTE_KEYS.has(normalizedKey)
    ) {
      issues.push(`${type} key must be a route path or a reserved route key`);
    }
  }

  return { issues, valid: issues.length === 0 };
}

export function validateRegistryValue(
  type: string,
  key: any,
  value: any,
): ValidationResult {
  const definition = getRegistryDefinition(type);
  const issues = [...validateRegistryKey(type, key).issues];

  if (definition?.valueKind === "object" && !isPlainObject(value)) {
    issues.push(`${type} values must be plain objects`);
  }
  if (
    definition?.valueKind === "component" &&
    typeof value !== "function" &&
    !isPlainObject(value)
  ) {
    issues.push(
      `${type} values must be component functions or component objects`,
    );
  }

  if (definition && type === REGISTRY_TYPES.DOCK)
    issues.push(...validateDockConfig(value).issues);
  if (definition && type === REGISTRY_TYPES.CONTROLS)
    issues.push(...validateControlsConfig(value).issues);

  const customValidator = getCustomRegistryValidator(type);
  if (customValidator) {
    const customResult = customValidator(value);
    if (customResult && !customResult.valid && Array.isArray(customResult.issues)) {
      issues.push(...customResult.issues);
    }
  }

  return { issues, valid: issues.length === 0 };
}

export function normalizeRegistryMetadata(
  metadata: any,
  {
    defaultCleanupDelayMs = null,
    defaultLifecycle = null,
    defaultSource = DEFAULT_SOURCE,
  }: {
    defaultCleanupDelayMs?: number | null;
    defaultLifecycle?: any;
    defaultSource?: any;
  } = {},
): any {
  const registryMeta = isObject(metadata) ? metadata : {};

  const normalizedDefaultDelay = parseFiniteNumber(defaultCleanupDelayMs);
  const fallbackCleanupDelayMs =
    normalizedDefaultDelay !== null && normalizedDefaultDelay >= 0
      ? normalizedDefaultDelay
      : null;
  const fallbackLifecycle = REGISTRY_LIFECYCLE_VALUES.has(defaultLifecycle)
    ? defaultLifecycle
    : null;

  const source =
    getValidString(registryMeta.source) ||
    getValidString(defaultSource, DEFAULT_SOURCE);
  const scope = getValidString(registryMeta.scope);
  const priority = parseFiniteNumber(registryMeta.priority);
  const lifecycle = resolveLifecycle(registryMeta, fallbackLifecycle);
  const validation = Object.values(REGISTRY_VALIDATION_MODES).includes(
    registryMeta.validation,
  )
    ? registryMeta.validation
    : null;

  const cleanupDelayCandidate = parseFiniteNumber(registryMeta.cleanupDelayMs);
  let cleanupDelayMs =
    cleanupDelayCandidate !== null && cleanupDelayCandidate >= 0
      ? cleanupDelayCandidate
      : fallbackCleanupDelayMs;

  if (lifecycle === REGISTRY_LIFECYCLES.IMMEDIATE) {
    cleanupDelayMs = 0;
  } else if (
    (lifecycle === REGISTRY_LIFECYCLES.GRACEFUL ||
      lifecycle === REGISTRY_LIFECYCLES.ROUTE) &&
    cleanupDelayMs === null
  ) {
    cleanupDelayMs = fallbackCleanupDelayMs;
  }

  return {
    cleanupDelayMs,
    lifecycle,
    priority,
    registerOptions: {
      ...(priority !== null && { priority }),
      ...(validation === REGISTRY_VALIDATION_MODES.STRICT && { validation }),
      ...(scope && { scope }),
    },
    source,
    ...(scope && { scope }),
    ...(validation && { validation }),
  };
}

export function pickRegistryMetadata(options: any): Record<string, any> {
  if (!isObject(options)) return {};
  return Object.fromEntries(
    REGISTRY_METADATA_KEYS.filter((key) => options[key] !== undefined).map(
      (key) => [key, options[key]],
    ),
  );
}

export function withRegistryMetadata(value: any, metadata: any): any {
  if (
    !isObject(value) ||
    !isObject(metadata) ||
    Object.keys(metadata).length === 0
  )
    return value;

  const currentMetadata = isObject(value.registry) ? value.registry : {};
  return { ...value, registry: { ...metadata, ...currentMetadata } };
}

export function normalizePageRegistryConfig(config: any): any {
  if (!isObject(config) || !isObject(config.registry)) return config;

  const pageMetadata = config.registry;
  const normalizedConfig: Record<string, any> = {};

  Object.entries(config).forEach(([key, value]) => {
    if (key === "registry") return;
    if (!REGISTRY_FEATURE_KEYS.has(key)) {
      normalizedConfig[key] = value;
      return;
    }
    normalizedConfig[key] = Array.isArray(value)
      ? value.map((entry) => withRegistryMetadata(entry, pageMetadata))
      : withRegistryMetadata(value, pageMetadata);
  });

  return normalizedConfig;
}

export function defineRegistryConfig(
  config: any,
  defaults: Record<string, any> = {},
): any {
  if (!isObject(config) || !isObject(defaults)) return config;

  const metadata = pickRegistryMetadata(defaults);
  if (Object.keys(metadata).length === 0) return config;

  return {
    ...config,
    registry: {
      ...metadata,
      ...(isObject(config.registry) ? config.registry : {}),
    },
  };
}
