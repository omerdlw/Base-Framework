import {
  DEFAULT_REGISTRY_SCOPE,
  DEFAULT_SOURCE,
  REGISTRY_DEFINITIONS,
  REGISTRY_RESOLVERS,
  REGISTRY_SOURCE_PRIORITY,
  REGISTRY_TYPES,
} from "./constants";
import {
  getSourceRank,
  hasOwnProperty,
  isObject,
  resolveInstanceId,
  resolveRegisterInput,
  resolveScope,
  resolveUnregisterInput,
  shallowEqual,
} from "./utils";
import { validateRegistryKey } from "./schema";
import type {
  RegisterOperation,
  RegistryOperation,
  SourceRecord,
  UnregisterOperation,
} from "./types";

export function isRegistryType(type: string): boolean {
  return Boolean(REGISTRY_DEFINITIONS[type]);
}

export function createInitialRegistries(): Record<string, Record<string, any>> {
  return Object.fromEntries(
    Object.keys(REGISTRY_DEFINITIONS).map((type) => [type, {}]),
  );
}

function buildSourceRecord({
  source,
  value,
  instanceId = null,
  priority,
  timestamp,
  sequence,
  scope = DEFAULT_REGISTRY_SCOPE,
}: {
  source: string;
  value: any;
  instanceId?: string | null;
  priority: number;
  timestamp: number;
  sequence?: number;
  scope?: string;
}): SourceRecord {
  return {
    updatedAt: timestamp,
    sequence: Number.isFinite(sequence) ? (sequence as number) : timestamp,
    instanceId: typeof instanceId === "string" ? instanceId : null,
    priority,
    value,
    source,
    scope,
  };
}

export function createRecordKey(
  source: string,
  instanceId: string | null = null,
  scope: string = DEFAULT_REGISTRY_SCOPE,
): string {
  if (scope === DEFAULT_REGISTRY_SCOPE) {
    if (typeof instanceId === "string" && instanceId.length > 0) {
      return `instance:${JSON.stringify([source, instanceId])}`;
    }
    return `source:${JSON.stringify(source)}`;
  }
  if (typeof instanceId === "string" && instanceId.length > 0) {
    return `instance:${JSON.stringify([scope, source, instanceId])}`;
  }
  return `source:${JSON.stringify([scope, source])}`;
}

function getSourceRecords(
  entry: any,
  source: string,
  scope: string | null = null,
): { recordKey: string; record: SourceRecord | null }[] {
  if (!entry) return [];
  return Object.entries(entry)
    .map(([recordKey, rawRecord]) => ({
      recordKey,
      record: toSourceRecord(rawRecord, recordKey),
    }))
    .filter(
      ({ record }) =>
        record?.source === source && (scope === null || record.scope === scope),
    );
}

function getSourceRecord(
  entry: any,
  source: string,
  instanceId: string | null = null,
  scope: string = DEFAULT_REGISTRY_SCOPE,
): SourceRecord | null {
  const recordKey = createRecordKey(source, instanceId, scope);
  return toSourceRecord(entry?.[recordKey], source);
}

function resolveRecordPriority(options: any, source: string): number {
  if (isObject(options) && hasOwnProperty(options, "priority")) {
    const parsedPriority = Number(options.priority);
    if (Number.isFinite(parsedPriority)) return parsedPriority;
  }
  return REGISTRY_SOURCE_PRIORITY[source] ?? 0;
}

export function toSourceRecord(
  rawRecord: any,
  source: string = DEFAULT_SOURCE,
): SourceRecord | null {
  if (rawRecord === undefined) return null;

  const isWrappedRecord =
    isObject(rawRecord) &&
    hasOwnProperty(rawRecord, "value") &&
    hasOwnProperty(rawRecord, "updatedAt") &&
    hasOwnProperty(rawRecord, "priority") &&
    hasOwnProperty(rawRecord, "source");

  if (isWrappedRecord) {
    const parsedPriority = Number(rawRecord.priority);
    return {
      updatedAt: Number(rawRecord.updatedAt) || 0,
      sequence: Number(rawRecord.sequence) || Number(rawRecord.updatedAt) || 0,
      instanceId:
        typeof rawRecord.instanceId === "string" ? rawRecord.instanceId : null,
      priority: Number.isFinite(parsedPriority)
        ? parsedPriority
        : (REGISTRY_SOURCE_PRIORITY[source] ?? 0),
      source: typeof rawRecord.source === "string" ? rawRecord.source : source,
      scope:
        typeof rawRecord.scope === "string"
          ? rawRecord.scope
          : DEFAULT_REGISTRY_SCOPE,
      value: rawRecord.value,
    };
  }

  return {
    updatedAt: 0,
    sequence: 0,
    instanceId: null,
    priority: REGISTRY_SOURCE_PRIORITY[source] ?? 0,
    source,
    scope: DEFAULT_REGISTRY_SCOPE,
    value: rawRecord,
  };
}

function compareRecords(a: SourceRecord, b: SourceRecord): number {
  if (a.priority !== b.priority) return a.priority - b.priority;
  const rankDiff = getSourceRank(a.source) - getSourceRank(b.source);
  if (rankDiff !== 0) return rankDiff;
  return (a.sequence ?? a.updatedAt) - (b.sequence ?? b.updatedAt);
}

function recordsHaveSameValue(
  prevRecord: SourceRecord | null,
  nextRecord: SourceRecord,
): boolean {
  if (Object.is(prevRecord?.value, nextRecord?.value)) return true;
  if (isObject(prevRecord?.value) && isObject(nextRecord?.value)) {
    return shallowEqual(prevRecord!.value, nextRecord.value);
  }
  return false;
}

function hasRecordChanged(
  prevRecord: SourceRecord | null,
  nextRecord: SourceRecord,
): boolean {
  if (!prevRecord) return true;
  return (
    prevRecord.priority !== nextRecord.priority ||
    prevRecord.source !== nextRecord.source ||
    prevRecord.instanceId !== nextRecord.instanceId ||
    prevRecord.scope !== nextRecord.scope ||
    !recordsHaveSameValue(prevRecord, nextRecord)
  );
}

function hasAnySourceRecord(entry: any): boolean {
  return Object.values(entry || {}).some(
    (rawRecord) => rawRecord !== undefined,
  );
}

function setSourceRecord(
  state: any,
  type: string,
  key: string,
  source: string,
  record: SourceRecord,
): any {
  const typeRegistry = state[type] || {};
  const currentEntry = typeRegistry[key] || {};
  const recordKey = createRecordKey(source, record.instanceId, record.scope);
  const prevRecord = toSourceRecord(currentEntry[recordKey], source);

  if (!hasRecordChanged(prevRecord, record)) {
    return state;
  }

  return {
    ...state,
    [type]: {
      ...typeRegistry,
      [key]: {
        ...currentEntry,
        [recordKey]: record,
      },
    },
  };
}

export function removeSourceRecord(
  state: any,
  type: string,
  key: string,
  source: string,
  instanceId: string | null = null,
  scope: string | null = null,
): any {
  const typeRegistry = state[type];
  const currentEntry = typeRegistry?.[key];
  if (!typeRegistry || !currentEntry) return state;

  let activeRecords: { recordKey: string; record: SourceRecord }[] = [];

  if (
    typeof instanceId === "string" &&
    instanceId.length > 0 &&
    scope !== null
  ) {
    const safeScope = scope || DEFAULT_REGISTRY_SCOPE;
    const recordKey = createRecordKey(source, instanceId, safeScope);
    const record = getSourceRecord(currentEntry, source, instanceId, safeScope);

    if (record) activeRecords.push({ recordKey, record });
  } else {
    activeRecords = getSourceRecords(currentEntry, source, scope)
      .filter(({ record }) => !instanceId || record?.instanceId === instanceId)
      .filter((entry): entry is { recordKey: string; record: SourceRecord } =>
        Boolean(entry.record),
      );
  }

  if (activeRecords.length === 0) return state;

  const nextEntry = { ...currentEntry };
  activeRecords.forEach(({ recordKey }) => {
    delete nextEntry[recordKey];
  });

  if (!hasAnySourceRecord(nextEntry)) {
    const nextTypeRegistry = { ...typeRegistry };
    delete nextTypeRegistry[key];
    return { ...state, [type]: nextTypeRegistry };
  }

  return {
    ...state,
    [type]: { ...typeRegistry, [key]: nextEntry },
  };
}

function getResolverKind(type: string): string {
  return REGISTRY_RESOLVERS[type] || "priority";
}

function mergeNavValues(values: any[]): any {
  return values.reduce((acc, value) => {
    const next = { ...acc, ...value };
    if (isObject(acc.style) && isObject(value.style)) {
      next.style = { ...acc.style, ...value.style };
      ["card", "icon", "title", "description"].forEach((field) => {
        if (isObject(acc.style[field]) && isObject(value.style[field])) {
          next.style[field] = { ...acc.style[field], ...value.style[field] };
        }
      });
    }
    return next;
  }, {});
}

export function resolveEntryValue(
  type: string,
  entry: any,
  scope: string | null = null,
): any {
  if (!entry) return undefined;

  const activeRecords = Object.entries(entry)
    .map(([source, rawRecord]) => toSourceRecord(rawRecord, source))
    .filter(
      (record): record is SourceRecord =>
        record !== null && (scope === null || record.scope === scope),
    );

  if (activeRecords.length === 0) return undefined;

  if (getResolverKind(type) === "merge") {
    const sortedRecords = [...activeRecords].sort(compareRecords);
    const mergeCandidate = sortedRecords.every((record) =>
      isObject(record.value),
    );

    if (mergeCandidate) {
      const values = sortedRecords.map((record) => record.value);
      return type === REGISTRY_TYPES.NAV
        ? mergeNavValues(values)
        : Object.assign({}, ...values);
    }
    return sortedRecords[sortedRecords.length - 1].value;
  }

  return activeRecords.reduce((winner, current) =>
    compareRecords(current, winner) > 0 ? current : winner,
  ).value;
}

export function createResolverCache(): (
  type: string,
  entry: any,
  scope?: string | null,
) => any {
  const entryCache = new WeakMap<object, Map<string, any>>();

  return (type: string, entry: any, scope: string | null = null) => {
    if (!entry || typeof entry !== "object") {
      return resolveEntryValue(type, entry, scope);
    }

    let typeCache = entryCache.get(entry);
    if (!typeCache) {
      typeCache = new Map();
      entryCache.set(entry, typeCache);
    }

    const cacheKey = `${type}::${scope || "default"}`;

    if (typeCache.has(cacheKey)) return typeCache.get(cacheKey);

    const value = resolveEntryValue(type, entry, scope);
    typeCache.set(cacheKey, value);
    return value;
  };
}

export function createRegisterOperation(
  type: string,
  key: string,
  item: any,
  sourceOrOptions: any,
  optionsArg: any,
  timestamp: number,
  sequence: number = timestamp,
): RegisterOperation {
  const { source, options } = resolveRegisterInput(sourceOrOptions, optionsArg);
  const instanceId = resolveInstanceId(options);
  const scope = resolveScope(options);

  return {
    kind: "register",
    validation: options.validation,
    source,
    scope,
    record: buildSourceRecord({
      source,
      value: item,
      instanceId,
      priority: resolveRecordPriority(options, source),
      scope,
      timestamp,
      sequence,
    }),
    instanceId,
    type,
    key: typeof key === "string" ? key.trim() : key,
  };
}

export function createUnregisterOperation(
  type: string,
  key: string,
  sourceOrOptions: any,
): UnregisterOperation {
  const { scope, source, instanceId } = resolveUnregisterInput(sourceOrOptions);
  return {
    kind: "unregister",
    instanceId,
    scope,
    source,
    type,
    key: typeof key === "string" ? key.trim() : key,
  };
}

export function isValidRegistryTarget(type: string, key: any): boolean {
  return validateRegistryKey(type, key).valid;
}

export function applyOperation(state: any, operation: RegistryOperation): any {
  if (!isValidRegistryTarget(operation?.type, operation?.key)) return state;

  if (operation.kind === "register") {
    return setSourceRecord(
      state,
      operation.type,
      operation.key,
      operation.source,
      operation.record,
    );
  }
  if (operation.kind === "unregister") {
    return removeSourceRecord(
      state,
      operation.type,
      operation.key,
      operation.source,
      operation.instanceId,
      operation.scope,
    );
  }
  return state;
}

export function hasOperationEffect(
  state: any,
  operation: RegistryOperation,
): boolean {
  if (!isValidRegistryTarget(operation?.type, operation?.key)) return false;

  if (operation.kind === "register") {
    const currentRecord = getSourceRecord(
      state[operation.type]?.[operation.key],
      operation.source,
      operation.instanceId,
      operation.scope,
    );
    return hasRecordChanged(currentRecord, operation.record);
  }

  if (operation.kind === "unregister") {
    const entry = state[operation.type]?.[operation.key];
    if (
      typeof operation.instanceId === "string" &&
      operation.instanceId.length > 0
    ) {
      return operation.scope === null
        ? getSourceRecords(entry, operation.source).some(
            ({ record }) => record?.instanceId === operation.instanceId,
          )
        : Boolean(
            getSourceRecord(
              entry,
              operation.source,
              operation.instanceId,
              operation.scope,
            ),
          );
    }
    return (
      getSourceRecords(entry, operation.source, operation.scope).length > 0
    );
  }
  return false;
}

export function resolveEffectiveOperations(
  state: any,
  operations: RegistryOperation[],
): { effectiveOperations: RegistryOperation[]; nextState: any } {
  const effectiveOperations: RegistryOperation[] = [];
  let nextState = state;

  operations.forEach((operation) => {
    if (!hasOperationEffect(nextState, operation)) return;
    effectiveOperations.push(operation);
    nextState = applyOperation(nextState, operation);
  });

  return { effectiveOperations, nextState };
}

export function runScopedBatch(
  batch: (fn: (queue: any) => void) => number,
  executor: (scopedQueue: any) => void,
  createScopedQueue: (queue: any) => any,
): number {
  if (typeof executor !== "function") return 0;
  return batch((queue) => executor(createScopedQueue(queue)));
}
