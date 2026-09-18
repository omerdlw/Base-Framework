import {
  DEFAULT_REGISTRY_SCOPE,
  DEFAULT_SOURCE,
  REGISTRY_DEFINITIONS,
  REGISTRY_SOURCE_RANK,
} from "./constants";
import type { PageController, RegistryDefinition } from "./types";
import { createInlineSurfaceEntry } from "@/core/modules/nav";
import {
  isObject,
  isPlainObject,
  shallowEqual,
  trimToNull,
} from "@/core/utils";

export { isObject, isPlainObject, shallowEqual };

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

export function resolvePageNav(effectiveConfig: any): any {
  if (!effectiveConfig || typeof effectiveConfig !== "object") return null;
  const navObj = effectiveConfig.nav || {};
  const rawTitle = navObj.title ?? effectiveConfig.title;
  const rawDescription = navObj.description ?? effectiveConfig.description;
  const rawIcon = navObj.icon ?? effectiveConfig.icon;
  const rawBanner =
    navObj.banner ??
    navObj.bannerUrl ??
    effectiveConfig.banner ??
    effectiveConfig.bannerUrl;
  const rawBannerPosition =
    navObj.bannerPosition ?? effectiveConfig.bannerPosition;
  const rawBannerSize = navObj.bannerSize ?? effectiveConfig.bannerSize;
  const rawBannerOpacity =
    navObj.bannerOpacity ?? effectiveConfig.bannerOpacity;
  const rawBannerRepeat = navObj.bannerRepeat ?? effectiveConfig.bannerRepeat;
  const rawPath = navObj.path ?? effectiveConfig.path;
  const rawBreadcrumbs = navObj.breadcrumbs ?? effectiveConfig.breadcrumbs;

  const baseNav = effectiveConfig.nav;
  const hasNav =
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
    Boolean(baseNav);

  if (!hasNav) return null;
  return {
    ...(baseNav || {}),
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

export function resolvePageBackground(effectiveConfig: any): any {
  if (!effectiveConfig || typeof effectiveConfig !== "object") return null;
  const bg = effectiveConfig.background;
  if (!bg) return null;
  if (typeof bg === "string") return { preset: bg };
  if (typeof bg === "object") return bg;
  return null;
}

export function resolvePageAmbient(effectiveConfig: any): any {
  if (!effectiveConfig || typeof effectiveConfig !== "object") return null;
  const amb = effectiveConfig.ambient;
  const bannerSource =
    effectiveConfig.nav?.banner ??
    effectiveConfig.nav?.bannerUrl ??
    effectiveConfig.banner ??
    effectiveConfig.bannerUrl ??
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
  if (bannerSource) {
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

export function resolvePageAuth(effectiveConfig: any): {
  enabled: boolean;
  openSignIn?: boolean;
  [key: string]: any;
} {
  if (!effectiveConfig || typeof effectiveConfig !== "object")
    return { enabled: false };
  const authConfig = effectiveConfig.auth;
  if (!authConfig) return { enabled: false };
  if (authConfig === true) return { enabled: true, openSignIn: true };
  if (typeof authConfig === "object") return { enabled: true, ...authConfig };
  return { enabled: false };
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
  const navActions = effectiveConfig.nav?.actions;
  if (Array.isArray(navActions)) return navActions;
  if (Array.isArray(effectiveConfig.actions)) return effectiveConfig.actions;
  return [];
}

export function createFallbackController({
  bgActions,
  modalActions,
  navActions,
  toast,
}: {
  bgActions?: any;
  modalActions?: any;
  navActions?: any;
  toast?: any;
}): PageController {
  const surfacesDict: Record<string, any> = {};
  const modalsDict: Record<string, any> = {};

  const surface = (idOrDef: any, props: Record<string, any> = {}) => {
    let target = idOrDef;
    if (typeof target?.open === "function") {
      return target.open(props);
    }
    if (typeof target === "function") {
      try {
        const potentialEntry = target(props);
        if (
          potentialEntry &&
          typeof potentialEntry === "object" &&
          (potentialEntry.component ||
            potentialEntry.id ||
            potentialEntry.render)
        ) {
          return navActions?.openSurface?.(potentialEntry);
        }
      } catch {
        return navActions?.openSurface?.(
          createInlineSurfaceEntry({ component: target, props }),
        );
      }
      return navActions?.openSurface?.(
        createInlineSurfaceEntry({ component: target, props }),
      );
    }
    if (target && typeof target === "object") {
      return navActions?.openSurface?.(target);
    }
    return undefined;
  };

  const modal = (idOrDef: any, props: Record<string, any> = {}) => {
    let target = idOrDef;
    if (typeof target?.open === "function") {
      return target.open(props);
    }
    if (target) {
      return modalActions?.openModal?.(target, props);
    }
    return undefined;
  };

  return {
    Provider: ({ children }: { children?: any }) => children,
    background: {
      set: () => {},
      setVideoPlaying: (playing: boolean) =>
        bgActions?.setVideoPlaying?.(playing),
      toggleMute: () => bgActions?.toggleMute?.(),
      toggleVideo: () => bgActions?.toggleVideo?.(),
    },
    closeAllModals: () => modalActions?.closeAllModals?.(),
    closeAllSurfaces: () => navActions?.closeAllSurfaces?.(),
    closeModal: (id: string) => modalActions?.closeModal?.(id),
    closeSurface: (id: string) => navActions?.closeSurface?.(id),
    config: {},
    modal,
    modals: modalsDict,
    reset: () => {},
    set: () => {},
    setActions: () => {},
    setAmbient: () => {},
    setBackground: () => {},
    setBanner: () => {},
    setControls: () => {},
    setDescription: () => {},
    setIcon: () => {},
    setLoading: () => {},
    setNav: () => {},
    setTitle: () => {},
    surface,
    surfaces: surfacesDict,
    toast: toast || {
      dismiss: () => {},
      error: () => {},
      info: () => {},
      loading: () => {},
      promise: (promise: any) => promise,
      success: () => {},
      warning: () => {},
    },
  };
}
