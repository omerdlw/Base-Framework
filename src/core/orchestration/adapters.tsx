"use client";

import { useId, useMemo, useRef } from "react";
import { useIsomorphicLayoutEffect } from "@/core/hooks";
import {
  pickRegistryMetadata,
  REGISTRY_SOURCES,
  withRegistryMetadata,
} from "./schema";
import { usePageRegistry, useRegistry } from "./hooks";
import { useRegistryActions } from "./provider";

function createFeatureConfig(
  feature: string,
  value: any,
  options?: { enabled?: boolean; [key: string]: any },
): Record<string, any> | null {
  if (options?.enabled === false || value == null) {
    return null;
  }

  const metadata = pickRegistryMetadata(options);
  const payload = Array.isArray(value)
    ? value.map((entry) => withRegistryMetadata(entry, metadata))
    : withRegistryMetadata(value, metadata);

  return {
    [feature]: payload,
  };
}

export function createPageRegistryConfig(
  features: Record<string, any> | null | undefined,
  options?: { enabled?: boolean; [key: string]: any },
): Record<string, any> | null {
  if (options?.enabled === false || !features) {
    return null;
  }

  const metadata = pickRegistryMetadata(options);
  const combined: Record<string, any> = {};
  let hasEntries = false;

  for (const [feature, value] of Object.entries(features)) {
    if (value == null) continue;
    combined[feature] = Array.isArray(value)
      ? value.map((entry) => withRegistryMetadata(entry, metadata))
      : withRegistryMetadata(value, metadata);
    hasEntries = true;
  }

  return hasEntries ? combined : null;
}

/**
 * Factory for creating declarative feature registration hooks for built-in or custom modules.
 */
export function createFeatureRegistrationHook(featureKey: string) {
  return function useFeatureRegistration(config: any, options?: any): void {
    usePageRegistry(createFeatureConfig(featureKey, config, options));
  };
}

export const useDockRegistration = createFeatureRegistrationHook("dock");
export const useDock = useDockRegistration;

export function useDockBanner(
  banner: any,
  options?: {
    path?: string;
    position?: string;
    size?: string;
    opacity?: number;
    repeat?: string;
    [key: string]: any;
  },
): void {
  const position = options?.position;
  const size = options?.size;
  const opacity = options?.opacity;
  const repeat = options?.repeat;
  const targetPath = options?.path;

  const config = useMemo(() => {
    if (!banner) return null;
    if (typeof banner === "string") {
      return {
        bannerUrl: banner,
        ...(position ? { bannerPosition: position } : {}),
        ...(size ? { bannerSize: size } : {}),
        ...(opacity !== undefined ? { bannerOpacity: opacity } : {}),
        ...(repeat ? { bannerRepeat: repeat } : {}),
        ...(targetPath ? { path: targetPath } : {}),
      };
    }
    if (typeof banner === "object") {
      return {
        ...banner,
        bannerUrl: banner.url || banner.bannerUrl,
        bannerPosition: banner.position || banner.bannerPosition || position,
        bannerSize: banner.size || banner.bannerSize || size,
        bannerOpacity: banner.opacity ?? banner.bannerOpacity ?? opacity,
        bannerRepeat: banner.repeat || banner.bannerRepeat || repeat,
        ...(targetPath ? { path: targetPath } : {}),
      };
    }
    return null;
  }, [banner, position, size, opacity, repeat, targetPath]);

  useDockRegistration(config, options);
}

export const useBackgroundRegistration =
  createFeatureRegistrationHook("background");
export const useBackground = useBackgroundRegistration;

export const useControlsRegistration =
  createFeatureRegistrationHook("controls");
export const useControls = useControlsRegistration;

export const useLoadingRegistration = createFeatureRegistrationHook("loading");
export const useLoading = useLoadingRegistration;

export const useContextMenuRegistration =
  createFeatureRegistrationHook("contextMenu");
export const useContextMenu = useContextMenuRegistration;

export const useModalRegistration = createFeatureRegistrationHook("modal");
export const useModal = useModalRegistration;

export function RegistryBootstrap({ entries = [] }: { entries?: any[] }): null {
  const { batch } = useRegistryActions();
  const defaultId = useId();
  const instanceIdRef = useRef(`registry-bootstrap-${defaultId}`);

  useIsomorphicLayoutEffect(() => {
    if (!Array.isArray(entries) || entries.length === 0) return undefined;

    const validEntries = entries.filter(
      (entry) => entry?.type && entry?.items && typeof entry.items === "object",
    );

    if (validEntries.length === 0) return undefined;

    const processEntries = (queue: any, action: "register" | "unregister") => {
      validEntries.forEach((entry) => {
        const source = entry.source || REGISTRY_SOURCES.STATIC;
        const options = {
          ...(entry.options || {}),
          instanceId: instanceIdRef.current,
        };

        if (action === "register") {
          Object.entries(entry.items).forEach(([key, value]) => {
            queue.register(entry.type, key, value, source, options);
          });
        } else if (action === "unregister") {
          Object.keys(entry.items).forEach((key) => {
            queue.unregister(entry.type, key, { ...options, source });
          });
        }
      });
    };

    batch((queue: any) => processEntries(queue, "register"));

    return () => {
      batch((queue: any) => processEntries(queue, "unregister"));
    };
  }, [batch, entries]);

  return null;
}

export function createRouteRegistry({
  displayName = "RouteRegistry",
  resolveConfig,
}: {
  displayName?: string;
  resolveConfig?: (props: any) => any;
}) {
  function RouteRegistry(props: any) {
    const config =
      typeof resolveConfig === "function" ? resolveConfig(props) : null;
    useRegistry(config || {});
    return null;
  }

  RouteRegistry.displayName = displayName;
  return RouteRegistry;
}
