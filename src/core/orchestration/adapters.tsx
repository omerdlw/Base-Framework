"use client";

import { useId, useMemo, useRef } from "react";
import { useIsomorphicLayoutEffect } from "@/core/hooks";
import { useNavHud } from "@/core/modules/nav";
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

export function useNavRegistration(config: any, options?: any): void {
  usePageRegistry(createFeatureConfig("nav", config, options));
}

export const useNav = useNavRegistration;

export function useNavBanner(
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

  useNavRegistration(config, options);
}

export function useNavHudRegistration(
  config: any,
  options?: { enabled?: boolean; [key: string]: any },
): void {
  useNavHud(options?.enabled === false ? null : config);
}

export function useBackgroundRegistration(config: any, options?: any): void {
  usePageRegistry(createFeatureConfig("background", config, options));
}

export const useBackground = useBackgroundRegistration;

export function useControlsRegistration(config: any, options?: any): void {
  usePageRegistry(createFeatureConfig("controls", config, options));
}

export const useControls = useControlsRegistration;

export function useLoadingRegistration(config: any, options?: any): void {
  usePageRegistry(createFeatureConfig("loading", config, options));
}

export const useLoading = useLoadingRegistration;

export function useContextMenuRegistration(config: any, options?: any): void {
  usePageRegistry(createFeatureConfig("contextMenu", config, options));
}

export const useContextMenu = useContextMenuRegistration;

export function useModalRegistration(config: any, options?: any): void {
  usePageRegistry(createFeatureConfig("modal", config, options));
}

export const useModal = useModalRegistration;

export {
  PageControllerContext,
  PageControllerProvider,
  usePage,
  usePageContext,
  usePageController,
} from "./page-controller";

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
