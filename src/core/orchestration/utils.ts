import {
  DEFAULT_REGISTRY_SCOPE,
  DEFAULT_SOURCE,
  REGISTRY_DEFINITIONS,
  REGISTRY_FEATURE_KEYS,
  REGISTRY_RESOLVERS,
  REGISTRY_SINGLETON_KEYS,
  REGISTRY_SOURCE_RANK,
} from "./constants";
import type {
  PageConfig,
  PageController,
  PageResolverFn,
  RegistryDefinition,
  RegistryModuleConfig,
  ValidationResult,
} from "./types";
import {
  isObject,
  isPlainObject,
  shallowEqual,
  trimToNull,
} from "@/core/utils";

export { isObject, isPlainObject, shallowEqual };

const customValidators = new Map<string, (config: any) => ValidationResult>();
const customPageResolvers = new Map<string, PageResolverFn>();

/**
 * Dynamically registers a new orchestration module type into the Core Registry Engine
 * without modifying `src/core` (Open/Closed Principle).
 */
export function defineRegistryModule(
  type: string,
  config: RegistryModuleConfig,
): RegistryDefinition {
  const normalizedType = String(type).trim();
  const definition: RegistryDefinition = Object.freeze({
    defaultCleanupDelayMs: config.defaultCleanupDelayMs ?? 600,
    defaultLifecycle: config.defaultLifecycle ?? "immediate",
    keyPolicy: config.keyPolicy ?? "named",
    resolver: config.resolver ?? "priority",
    valueKind: config.valueKind ?? "object",
  });

  REGISTRY_DEFINITIONS[normalizedType] = definition;
  if (definition.resolver === "merge") {
    REGISTRY_RESOLVERS[normalizedType] = "merge";
  }
  if (config.featureKey) {
    REGISTRY_FEATURE_KEYS.add(config.featureKey);
  }
  if (config.singletonKey) {
    REGISTRY_SINGLETON_KEYS[normalizedType] = config.singletonKey;
  }
  if (typeof config.validator === "function") {
    customValidators.set(normalizedType, config.validator);
  }
  return definition;
}

export function getCustomRegistryValidator(
  type: string,
): ((config: any) => ValidationResult) | undefined {
  return customValidators.get(type);
}

/**
 * Registers a custom page configuration resolver for `usePage(config)`.
 */
export function registerPageResolver<T = any>(
  key: string,
  resolver: PageResolverFn<T>,
): () => void {
  const normalizedKey = String(key).trim();
  if (!normalizedKey || typeof resolver !== "function") return () => {};
  customPageResolvers.set(normalizedKey, resolver);
  REGISTRY_FEATURE_KEYS.add(normalizedKey);
  return () => {
    customPageResolvers.delete(normalizedKey);
  };
}

export function resolveCustomPageConfigs(
  effectiveConfig: PageConfig,
): Record<string, any> {
  if (!effectiveConfig || customPageResolvers.size === 0) return {};
  const resolved: Record<string, any> = {};
  customPageResolvers.forEach((resolver, key) => {
    const val = resolver(effectiveConfig);
    if (val !== undefined && val !== null) {
      resolved[key] = val;
    }
  });
  return resolved;
}

export function getRegistryDefinition(type: string): RegistryDefinition | null {
  return REGISTRY_DEFINITIONS[type] || null;
}

export function hasOwnProperty(target: any, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(target, key);
}

export function parseFiniteNumber(value: any): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getValidString(
  value: any,
  fallback: string | null = null,
): string | null {
  return trimToNull(value) ?? fallback;
}

export function resolveInstanceId(value: any): string | null {
  return isObject(value) && typeof value.instanceId === "string"
    ? value.instanceId
    : null;
}

export function getSourceRank(source: string): number {
  return REGISTRY_SOURCE_RANK[source] ?? 0;
}

export function resolveRegisterInput(
  sourceOrOptions: any,
  optionsArg?: any,
): { source: string; options: any } {
  if (typeof sourceOrOptions === "string") {
    return {
      source: sourceOrOptions,
      options: isObject(optionsArg) ? optionsArg : {},
    };
  }
  if (isObject(sourceOrOptions)) {
    return {
      source:
        typeof sourceOrOptions.source === "string"
          ? sourceOrOptions.source
          : DEFAULT_SOURCE,
      options: sourceOrOptions,
    };
  }
  return {
    source: DEFAULT_SOURCE,
    options: isObject(optionsArg) ? optionsArg : {},
  };
}

export function resolveScope(options: any): string {
  return typeof options?.scope === "string" && options.scope.trim()
    ? options.scope.trim()
    : DEFAULT_REGISTRY_SCOPE;
}

export function resolveUnregisterInput(sourceOrOptions: any): {
  instanceId: string | null;
  scope: string | null;
  source: string;
} {
  if (typeof sourceOrOptions === "string") {
    return { instanceId: null, scope: null, source: sourceOrOptions };
  }
  if (isObject(sourceOrOptions)) {
    return {
      instanceId: resolveInstanceId(sourceOrOptions),
      scope:
        typeof sourceOrOptions.scope === "string" &&
        sourceOrOptions.scope.trim()
          ? sourceOrOptions.scope.trim()
          : null,
      source:
        typeof sourceOrOptions.source === "string"
          ? sourceOrOptions.source
          : DEFAULT_SOURCE,
    };
  }
  return { instanceId: null, scope: null, source: DEFAULT_SOURCE };
}

export function mergeModuleConfigs(
  base: Record<string, any> = {},
  patch: Record<string, any> = {},
): Record<string, any> {
  const result: Record<string, any> = { ...base };
  Object.keys(patch).forEach((key) => {
    const baseVal = base[key];
    const patchVal = patch[key];
    if (
      baseVal &&
      typeof baseVal === "object" &&
      !Array.isArray(baseVal) &&
      patchVal &&
      typeof patchVal === "object" &&
      !Array.isArray(patchVal)
    ) {
      result[key] = { ...baseVal, ...patchVal };
    } else {
      result[key] = patchVal;
    }
  });
  return result;
}

export function resolvePageDock(effectiveConfig: any): any {
  if (!effectiveConfig || typeof effectiveConfig !== "object") return null;
  const dockObj = effectiveConfig.dock || {};
  const rawTitle = dockObj.title ?? effectiveConfig.title;
  const rawDescription = dockObj.description ?? effectiveConfig.description;
  const rawIcon = dockObj.icon ?? effectiveConfig.icon;
  const rawBanner =
    dockObj.banner ??
    dockObj.bannerUrl ??
    effectiveConfig.banner ??
    effectiveConfig.bannerUrl;
  const rawBannerPosition =
    dockObj.bannerPosition ?? effectiveConfig.bannerPosition;
  const rawBannerSize = dockObj.bannerSize ?? effectiveConfig.bannerSize;
  const rawBannerOpacity =
    dockObj.bannerOpacity ?? effectiveConfig.bannerOpacity;
  const rawBannerRepeat = dockObj.bannerRepeat ?? effectiveConfig.bannerRepeat;
  const rawPath = dockObj.path ?? effectiveConfig.path;
  const rawBreadcrumbs = dockObj.breadcrumbs ?? effectiveConfig.breadcrumbs;

  const baseDock = effectiveConfig.dock;
  const hasDock =
    rawTitle !== undefined ||
    rawDescription !== undefined ||
    rawIcon !== undefined ||
    rawBanner !== undefined ||
    rawBannerPosition !== undefined ||
    rawBannerSize !== undefined ||
    rawBannerOpacity !== undefined ||
    rawBannerRepeat !== undefined ||
    rawPath !== undefined ||
    rawBreadcrumbs !== undefined ||
    Boolean(baseDock);

  if (!hasDock) return null;
  return {
    ...(baseDock || {}),
    ...(rawTitle !== undefined && { title: rawTitle }),
    ...(rawDescription !== undefined && { description: rawDescription }),
    ...(rawIcon !== undefined && { icon: rawIcon }),
    ...(rawBanner !== undefined && {
      bannerUrl:
        typeof rawBanner === "object" && rawBanner !== null
          ? rawBanner.url || rawBanner.bannerUrl
          : rawBanner,
      ...(typeof rawBanner === "object" && rawBanner !== null
        ? { banner: rawBanner }
        : {}),
    }),
    ...(rawBannerPosition !== undefined && {
      bannerPosition: rawBannerPosition,
    }),
    ...(rawBannerSize !== undefined && { bannerSize: rawBannerSize }),
    ...(rawBannerOpacity !== undefined && { bannerOpacity: rawBannerOpacity }),
    ...(rawBannerRepeat !== undefined && { bannerRepeat: rawBannerRepeat }),
    ...(rawPath !== undefined && { path: rawPath }),
    ...(rawBreadcrumbs !== undefined && { breadcrumbs: rawBreadcrumbs }),
  };
}

function extractOrchestrationYouTubeId(
  input: unknown,
  allowBareId = false,
): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (allowBareId && /^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const prefixed = trimmed.match(/^(?:youtube|yt):([a-zA-Z0-9_-]{11})$/i);
  if (prefixed) return prefixed[1];
  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/i,
  );
  return match ? match[1] : null;
}

function isOrchestrationVideoUrl(input: unknown): boolean {
  if (!input || typeof input !== "string") return false;
  const trimmed = input.trim();
  if (extractOrchestrationYouTubeId(trimmed)) return true;
  if (
    trimmed.startsWith("/api/background/youtube") ||
    trimmed.startsWith("blob:")
  ) {
    return true;
  }
  const clean = trimmed.split("?")[0].split("#")[0].toLowerCase();
  return /\.(mp4|webm|mov|m4v|ogg|ogv|m3u8)$/i.test(clean);
}

export function resolvePageBackground(effectiveConfig: any): any {
  if (!effectiveConfig || typeof effectiveConfig !== "object") return null;
  const bg = effectiveConfig.background;
  if (!bg) return null;
  if (typeof bg === "string") {
    return isOrchestrationVideoUrl(bg) ? { video: bg } : { image: bg };
  }
  if (typeof bg === "object") {
    if (bg.youtube && !bg.video) {
      const ytId = extractOrchestrationYouTubeId(bg.youtube, true);
      return {
        ...bg,
        video: ytId
          ? extractOrchestrationYouTubeId(bg.youtube)
            ? bg.youtube
            : `https://www.youtube.com/watch?v=${ytId}`
          : bg.youtube,
      };
    }
    if (
      typeof bg.image === "string" &&
      extractOrchestrationYouTubeId(bg.image) &&
      !bg.video
    ) {
      return {
        ...bg,
        image: null,
        video: bg.image,
      };
    }
    return bg;
  }
  return null;
}

export function resolvePageAmbient(effectiveConfig: any): any {
  if (!effectiveConfig || typeof effectiveConfig !== "object") return null;
  const amb = effectiveConfig.ambient;
  const bg = effectiveConfig.background;
  const rawBgVideo =
    typeof bg === "string"
      ? bg
      : bg && typeof bg === "object"
        ? bg.video || bg.youtube || bg.image
        : null;
  const ytId = extractOrchestrationYouTubeId(
    rawBgVideo,
    Boolean(bg && typeof bg === "object" && bg.youtube && !bg.video),
  );
  const ytThumbnailFallback = ytId
    ? `/api/background/youtube?id=${encodeURIComponent(ytId)}&stream=thumbnail`
    : null;

  const bannerSource =
    effectiveConfig.dock?.banner ??
    effectiveConfig.dock?.bannerUrl ??
    effectiveConfig.banner ??
    effectiveConfig.bannerUrl ??
    ytThumbnailFallback ??
    null;

  if (!amb && !bannerSource) return null;
  if (amb === true || typeof amb === "string") {
    return {
      image: typeof amb === "string" ? amb : bannerSource,
      tintGlobals: true,
    };
  }
  if (typeof amb === "object") {
    return {
      image: amb.image ?? bannerSource,
      ...amb,
    };
  }
  if (bannerSource && !ytThumbnailFallback) {
    return {
      image: bannerSource,
      tintGlobals: true,
    };
  }
  return null;
}

export function resolvePageLoading(effectiveConfig: any): any {
  if (!effectiveConfig || typeof effectiveConfig !== "object") return null;
  const load = effectiveConfig.loading;
  if (load === undefined || load === null) return null;
  if (typeof load === "boolean") return { isLoading: load };
  if (typeof load === "string") return { isLoading: true, message: load };
  if (typeof load === "object") return load;
  return null;
}

export function defaultInlineSurfaceEntry(surface: any): Record<string, any> {
  if (!surface || typeof surface !== "object") {
    return { id: "inline-surface", component: surface };
  }
  return {
    id: surface.id || "inline-surface",
    ...surface,
  };
}

export function resolvePageGuard(effectiveConfig: any): {
  message?: string;
  onBlock?: (info: any) => void;
  when: boolean;
} {
  if (!effectiveConfig || typeof effectiveConfig !== "object")
    return { when: false };
  const guardConfig = effectiveConfig.guard;
  if (!guardConfig) return { when: false };
  return {
    message:
      guardConfig.message ||
      "You have unsaved changes. Are you sure you want to leave?",
    onBlock: guardConfig.onBlock,
    when: Boolean(guardConfig.when),
  };
}

export function resolvePageActions(effectiveConfig: any): any[] {
  if (!effectiveConfig || typeof effectiveConfig !== "object") return [];
  const dockActions = effectiveConfig.dock?.actions;
  if (Array.isArray(dockActions)) return dockActions;
  if (Array.isArray(effectiveConfig.actions)) return effectiveConfig.actions;
  return [];
}

export function resolveEffectivePageModules(
  effectiveConfig: PageConfig,
  isConsumer = false,
) {
  if (isConsumer) {
    return {
      actions: [] as any[],
      ambient: null,
      background: null,
      contextMenu: null,
      controls: null,
      customConfigs: null,
      guard: { when: false },
      loading: null,
      modal: null,
      dock: null,
    };
  }

  return {
    actions: resolvePageActions(effectiveConfig),
    ambient: resolvePageAmbient(effectiveConfig),
    background: resolvePageBackground(effectiveConfig),
    contextMenu: effectiveConfig.contextMenu || null,
    controls: effectiveConfig.controls || null,
    customConfigs: resolveCustomPageConfigs(effectiveConfig),
    guard: resolvePageGuard(effectiveConfig),
    loading: resolvePageLoading(effectiveConfig),
    modal: effectiveConfig.modal || null,
    dock: resolvePageDock(effectiveConfig),
  };
}

export function invokePageSurface(
  idOrDef: any,
  props: Record<string, any> = {},
  {
    createInlineSurfaceEntry = defaultInlineSurfaceEntry,
    dockActions,
    surfacesDict = {},
  }: {
    createInlineSurfaceEntry?: (surface: any) => any;
    dockActions?: any;
    surfacesDict?: Record<string, any>;
  } = {},
) {
  const target = typeof idOrDef === "string" ? surfacesDict[idOrDef] : idOrDef;
  if (!target) return undefined;

  if (typeof target?.open === "function") {
    return target.open(props);
  }

  if (typeof target === "function") {
    try {
      const potentialEntry = target(props);
      if (
        potentialEntry &&
        typeof potentialEntry === "object" &&
        (potentialEntry.component || potentialEntry.id || potentialEntry.render)
      ) {
        return dockActions?.openSurface?.(potentialEntry);
      }
    } catch {}
    return dockActions?.openSurface?.(
      createInlineSurfaceEntry({ component: target, props }),
    );
  }

  if (typeof target === "object") {
    return dockActions?.openSurface?.(target);
  }

  return undefined;
}

export function invokePageModal(
  idOrDef: any,
  props: Record<string, any> = {},
  {
    modalActions,
    modalsDict = {},
  }: {
    modalActions?: any;
    modalsDict?: Record<string, any>;
  } = {},
) {
  const target = typeof idOrDef === "string" ? modalsDict[idOrDef] : idOrDef;
  if (!target) return undefined;

  if (typeof target?.open === "function") {
    return target.open(props);
  }

  return modalActions?.openModal?.(target, props);
}
