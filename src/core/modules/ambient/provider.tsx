"use client";

import { createContext, use, useEffect, useMemo, useState } from "react";
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

const AmbientContext = createContext<AmbientContextValue>({
  isExtracting: false,
  palette: AMBIENT_DEFAULTS,
  setPalette: () => {},
});

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

export function useAmbient(): AmbientContextValue {
  return use(AmbientContext);
}

export function useAmbientColor(
  imageSource: AmbientImageSource,
  options: AmbientExtractOptions | null = null,
): { isExtracting: boolean; palette: AmbientPalette } {
  const optionsKey = options ? JSON.stringify(options) : "";
  const initialPalette =
    options?.initialPalette || options?.fallbackPalette || null;
  const initialPaletteKey = initialPalette
    ? JSON.stringify(initialPalette)
    : "";

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
    const parsedOptions = optionsKey ? JSON.parse(optionsKey) : {};
    const parsedInitial = initialPaletteKey
      ? JSON.parse(initialPaletteKey)
      : null;

    void extractPaletteFromImage(imageSource, {
      fallbackPalette: parsedInitial,
      ...parsedOptions,
    })
      .then((extracted) => {
        if (active) {
          setExtractedData({ ...extracted, source: srcKey });
        }
      })
      .catch(() => {
        if (active) {
          setExtractedData({
            black: parsedInitial?.black || AMBIENT_DEFAULTS.black,
            primary: parsedInitial?.primary || AMBIENT_DEFAULTS.primary,
            source: srcKey,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [imageSource, initialPaletteKey, optionsKey, srcKey]);

  const palette =
    imageSource && extractedData && extractedData.source === srcKey
      ? extractedData
      : initialPalette || AMBIENT_DEFAULTS;

  return { isExtracting, palette };
}

export function useAmbientTheme(config: Partial<AmbientConfig> = {}): {
  isExtracting: boolean;
  palette: AmbientPalette;
} {
  const {
    colors = null,
    image = null,
    initialPalette = null,
    options = null,
    scope = null,
    tintGlobals = true,
    transition = true,
  } = config || {};

  const initialPaletteKey = initialPalette
    ? JSON.stringify(initialPalette)
    : "";
  const optionsKey = options ? JSON.stringify(options) : "";
  const colorsKey = colors ? JSON.stringify(colors) : "";

  const resolvedOptions = useMemo(() => {
    const opts = optionsKey ? JSON.parse(optionsKey) : {};
    if (initialPaletteKey) {
      opts.initialPalette = JSON.parse(initialPaletteKey);
    }
    return opts;
  }, [initialPaletteKey, optionsKey]);

  const resolvedImage = typeof image === "function" ? image({}) : image;

  const { palette: extractedPalette, isExtracting } = useAmbientColor(
    resolvedImage,
    resolvedOptions,
  );

  const extractedPrimary = extractedPalette?.primary || "";
  const extractedBlack = extractedPalette?.black || "";

  const resolvedVarMap = useMemo(() => {
    const parsedColors = colorsKey ? JSON.parse(colorsKey) : null;
    return resolveAmbientVarMap({
      colors: parsedColors,
      extractedBlack,
      extractedPrimary,
      image: resolvedImage,
      tintGlobals,
    });
  }, [colorsKey, extractedBlack, extractedPrimary, resolvedImage, tintGlobals]);

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
