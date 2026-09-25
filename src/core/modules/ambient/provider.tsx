"use client";

import { createContext, use, useEffect, useMemo, useState } from "react";
import { useRequiredContext } from "@/core/hooks";
import { shallowEqual } from "@/core/utils";
import { AMBIENT_DEFAULTS, AMBIENT_TRANSITION_CLASSES } from "./constants";
import type {
  AmbientConfig,
  AmbientContextValue,
  AmbientExtractOptions,
  AmbientImageSource,
  AmbientPalette,
  AmbientProviderProps,
} from "./types";
import {
  applyScopedCssVariables,
  extractPaletteFromImage,
  resolveAmbientVarMap,
  resolveTargetElement,
} from "./utils";

const AmbientContext = createContext<AmbientContextValue | null>(null);

function useStableObject<T extends Record<string, any> | null | undefined>(
  value: T,
): T {
  const [stable, setStable] = useState<T>(value);
  if (!shallowEqual(stable, value)) {
    setStable(value);
  }
  return stable;
}

export function AmbientProvider({
  children,
  initialPalette = null,
}: AmbientProviderProps) {
  const [palette, setPalette] = useState<AmbientPalette>(
    () => initialPalette || AMBIENT_DEFAULTS,
  );
  const [isExtracting, setIsExtracting] = useState(false);

  const value = useMemo<AmbientContextValue>(
    () => ({ isExtracting, palette, setIsExtracting, setPalette }),
    [isExtracting, palette],
  );

  return <AmbientContext value={value}>{children}</AmbientContext>;
}

export function useAmbientColor(
  imageSource: AmbientImageSource,
  options: AmbientExtractOptions | null = null,
): { isExtracting: boolean; palette: AmbientPalette } {
  const stableOptions = useStableObject(options);
  const initialPalette = useStableObject(
    options?.initialPalette || options?.fallbackPalette || null,
  );

  const [extractedData, setExtractedData] = useState<AmbientPalette | null>(
    () => initialPalette,
  );

  const srcKey =
    typeof imageSource === "string" ? imageSource : imageSource?.src;

  const isExtracting = Boolean(
    imageSource && (!extractedData || extractedData.source !== srcKey),
  );

  useEffect(() => {
    if (!imageSource) return;

    let active = true;

    void extractPaletteFromImage(imageSource, {
      fallbackPalette: initialPalette,
      ...(stableOptions || {}),
    })
      .then((extracted) => {
        if (active) {
          setExtractedData({ ...extracted, source: srcKey });
        }
      })
      .catch(() => {
        if (active) {
          setExtractedData({
            black: initialPalette?.black || AMBIENT_DEFAULTS.black,
            primary: initialPalette?.primary || AMBIENT_DEFAULTS.primary,
            source: srcKey,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [imageSource, initialPalette, srcKey, stableOptions]);

  const palette =
    imageSource && extractedData && extractedData.source === srcKey
      ? extractedData
      : initialPalette || AMBIENT_DEFAULTS;

  return { isExtracting, palette };
}

export function useAmbientTheme(
  config: Partial<AmbientConfig> | string | null = null,
): {
  isExtracting: boolean;
  palette: AmbientPalette;
} {
  const ambientCtx = use(AmbientContext);
  const normalizedConfig: Partial<AmbientConfig> =
    typeof config === "string" ? { image: config } : config || {};

  const {
    colors = null,
    image = null,
    initialPalette = null,
    options = null,
    scope = null,
    tintGlobals = true,
    transition = true,
  } = normalizedConfig;

  const stableInitialPalette = useStableObject(initialPalette);
  const stableOptions = useStableObject(options);
  const resolvedColorsInput =
    typeof colors === "function" ? colors({}) : colors;
  const stableColors = useStableObject(resolvedColorsInput);

  const resolvedOptions = useMemo<AmbientExtractOptions>(
    () => ({
      ...(stableOptions || {}),
      ...(stableInitialPalette ? { initialPalette: stableInitialPalette } : {}),
    }),
    [stableInitialPalette, stableOptions],
  );

  const resolvedImage = typeof image === "function" ? image({}) : image;

  const { palette: extractedPalette, isExtracting } = useAmbientColor(
    resolvedImage,
    resolvedOptions,
  );

  const hasActiveConfig = Boolean(resolvedImage || stableColors);

  useEffect(() => {
    if (!hasActiveConfig || !ambientCtx) return;
    ambientCtx.setIsExtracting?.(isExtracting);
    ambientCtx.setPalette?.((prev) =>
      shallowEqual(prev, extractedPalette) ? prev : extractedPalette,
    );
  }, [ambientCtx, extractedPalette, hasActiveConfig, isExtracting]);

  const extractedPrimary = extractedPalette?.primary || "";
  const extractedBlack = extractedPalette?.black || "";

  const resolvedVarMap = useMemo(
    () =>
      resolveAmbientVarMap({
        colors: stableColors,
        extractedBlack,
        extractedPrimary,
        image: resolvedImage,
        tintGlobals,
      }),
    [
      extractedBlack,
      extractedPrimary,
      resolvedImage,
      stableColors,
      tintGlobals,
    ],
  );

  useEffect(() => {
    if (Object.keys(resolvedVarMap).length === 0) return;

    const targetEl = resolveTargetElement(scope);
    if (!targetEl) return;

    if (transition && targetEl.classList) {
      targetEl.classList.add(...AMBIENT_TRANSITION_CLASSES);
    }

    const varCleanup = applyScopedCssVariables(targetEl, resolvedVarMap);

    return () => {
      varCleanup();
      if (transition && targetEl.classList && scope) {
        targetEl.classList.remove(...AMBIENT_TRANSITION_CLASSES);
      }
    };
  }, [resolvedVarMap, scope, transition]);

  return { isExtracting, palette: extractedPalette };
}

export function useAmbient(
  configOrImage?: Partial<AmbientConfig> | string | null,
): AmbientContextValue {
  const ctx = useRequiredContext(
    AmbientContext,
    "useAmbient",
    "AmbientProvider",
  );
  const themeState = useAmbientTheme(configOrImage ?? null);

  return useMemo(() => {
    if (configOrImage) {
      return {
        ...ctx,
        isExtracting: themeState.isExtracting,
        palette: themeState.palette,
      };
    }
    return ctx;
  }, [configOrImage, ctx, themeState.isExtracting, themeState.palette]);
}
