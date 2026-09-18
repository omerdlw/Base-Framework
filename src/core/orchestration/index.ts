"use client";

export type * from "./types";

export {
  CONTROL_SIDES,
  DEFAULT_REGISTRY_SCOPE,
  DEFAULT_SOURCE,
  DYNAMIC_SOURCE,
  MAX_DIAGNOSTICS,
  NAV_CONFIG_FIELD_TYPES,
  NAVIGATION_POLICY_FIELD_TYPES,
  REGISTRY_DEFINITIONS,
  REGISTRY_FEATURE_KEYS,
  REGISTRY_KEYS,
  REGISTRY_LIFECYCLE_VALUES,
  REGISTRY_LIFECYCLES,
  REGISTRY_METADATA_KEY_SET,
  REGISTRY_METADATA_KEYS,
  REGISTRY_RESOLVERS,
  REGISTRY_ROUTE_KEYS,
  REGISTRY_SCOPE_KINDS,
  REGISTRY_SINGLETON_KEYS,
  REGISTRY_SOURCE_PRIORITY,
  REGISTRY_SOURCE_RANK,
  REGISTRY_SOURCES,
  REGISTRY_TYPES,
  REGISTRY_VALIDATION_MODES,
  VALID_PRIMITIVE_TYPES,
} from "./constants";

export {
  getSourceRank,
  getValidString,
  hasOwnProperty,
  isObject,
  isPlainObject,
  parseFiniteNumber,
  resolveInstanceId,
  resolvePageAuth,
  resolveRegisterInput,
  resolveScope,
  resolveUnregisterInput,
  shallowEqual,
} from "./utils";

export {
  defineRegistryConfig,
  getRegistryDefinition,
  normalizePageRegistryConfig,
  normalizeRegistryMetadata,
  pickRegistryMetadata,
  validateControlsConfig,
  validateNavConfig,
  validateRegistryKey,
  validateRegistryMetadata,
  validateRegistryValue,
  withRegistryMetadata,
} from "./schema";

export {
  applyOperation,
  createInitialRegistries,
  createRecordKey,
  createRegisterOperation,
  createResolverCache,
  createUnregisterOperation,
  hasOperationEffect,
  isRegistryType,
  isValidRegistryTarget,
  removeSourceRecord,
  resolveEffectiveOperations,
  resolveEntryValue,
  runScopedBatch,
  toSourceRecord,
} from "./operations";

export {
  RegistryProvider,
  createRegistryStore,
  useRegistryActions,
  useRegistryEntries,
  useRegistrySelector,
  useRegistryValue,
} from "./provider";

export {
  clearRegistryDiagnostics,
  createRegistryInspector,
  createRegistryScope,
  createRegistryTransaction,
  createScopedRegistryStore,
  getRegistryDiagnostics,
  normalizeRegistryScope,
  queryRegistryDiagnostics,
  recordRegistryDiagnostic,
  subscribeRegistryDiagnostics,
  useRegistryDiagnostics,
} from "./runtime";

export { applyRegistryConfig } from "./handlers";

export {
  useBackgroundValue,
  useContextMenuRegistry,
  useContextMenuValue,
  useLoadingValue,
  useModalRegistry,
  useModalValue,
  useNavRegistry,
  useNavRegistryActions,
  useNavValue,
  usePageRegistry,
  useRegistry,
} from "./hooks";

export {
  RegistryBootstrap,
  createRouteRegistry,
  PageControllerContext,
  PageControllerProvider,
  useBackground,
  useBackgroundRegistration,
  useContextMenu,
  useContextMenuRegistration,
  useControls,
  useControlsRegistration,
  useLoading,
  useLoadingRegistration,
  useModal,
  useModalRegistration,
  useNav,
  useNavBanner,
  useNavHudRegistration,
  useNavRegistration,
  usePage,
  usePageContext,
  usePageController,
} from "./adapters";
