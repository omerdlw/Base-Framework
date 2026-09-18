import {
  AMBIENT_CSS_VARS,
  AMBIENT_DEFAULTS,
  COLOR_EXTRACT_CONFIG,
} from "./constants";
import type {
  AmbientExtractOptions,
  AmbientImageSource,
  AmbientPalette,
  AmbientTarget,
  OklchColor,
} from "./types";

const paletteCache = new Map<string, AmbientPalette>();
const inFlightPromises = new Map<string, Promise<AmbientPalette>>();

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function rgbToOklch(r: number, g: number, b: number): OklchColor {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bOklab = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(a * a + bOklab * bOklab);
  const H = (Math.atan2(bOklab, a) * (180 / Math.PI) + 360) % 360;

  return {
    c: Math.max(0, Number(C.toFixed(3))),
    h: Math.max(0, Number(H.toFixed(1))),
    l: Math.max(0, Math.min(1, Number(L.toFixed(3)))),
  };
}

export function oklchToString(
  l: number | string,
  c: number | string,
  h: number | string,
  alpha: number | string = 1,
): string {
  const safeL = Math.max(0, Math.min(1, Number(l) || 0)).toFixed(3);
  const safeC = Math.max(0, Number(c) || 0).toFixed(3);
  const safeH = (Number(h) || 0).toFixed(1);
  const numericAlpha = Number(alpha);
  if (Number.isFinite(numericAlpha) && numericAlpha < 1 && numericAlpha >= 0) {
    return `oklch(${safeL} ${safeC} ${safeH} / ${numericAlpha})`;
  }
  return `oklch(${safeL} ${safeC} ${safeH})`;
}

function sampleImageData(imageData: ImageData): OklchColor {
  const data = imageData.data;
  const len = data.length;
  const numBins = 24;
  const binAngle = 360 / numBins;

  const bins = Array.from({ length: numBins }, () => ({
    count: 0,
    sumC: 0,
    sumCos: 0,
    sumL: 0,
    sumSin: 0,
  }));

  let neutralCount = 0;
  let neutralSumL = 0;
  let chromaticCount = 0;

  for (let i = 0; i < len; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 128) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const oklch = rgbToOklch(r, g, b);

    if (oklch.l < 0.04 || oklch.l > 0.96 || oklch.c < 0.02) {
      neutralCount++;
      neutralSumL += oklch.l;
      continue;
    }

    const binIndex = Math.floor(oklch.h / binAngle) % numBins;
    const rad = oklch.h * (Math.PI / 180);

    const bin = bins[binIndex];
    bin.count++;
    bin.sumL += oklch.l;
    bin.sumC += oklch.c;
    bin.sumCos += Math.cos(rad);
    bin.sumSin += Math.sin(rad);
    chromaticCount++;
  }

  if (chromaticCount === 0) {
    const avgL = neutralCount > 0 ? neutralSumL / neutralCount : 0.55;
    return { c: 0.03, h: 252, l: avgL };
  }

  let bestIndex = 0;
  let maxWindowCount = -1;

  for (let i = 0; i < numBins; i++) {
    const prev = bins[(i - 1 + numBins) % numBins];
    const curr = bins[i];
    const next = bins[(i + 1) % numBins];
    const windowCount = prev.count * 0.5 + curr.count + next.count * 0.5;

    if (windowCount > maxWindowCount) {
      maxWindowCount = windowCount;
      bestIndex = i;
    }
  }

  const prev = bins[(bestIndex - 1 + numBins) % numBins];
  const curr = bins[bestIndex];
  const next = bins[(bestIndex + 1) % numBins];

  const totalCount = prev.count + curr.count + next.count;
  if (totalCount === 0) {
    return { c: 0.19, h: 252, l: 0.55 };
  }

  const avgL = (prev.sumL + curr.sumL + next.sumL) / totalCount;
  const avgC = (prev.sumC + curr.sumC + next.sumC) / totalCount;
  const avgSin = prev.sumSin + curr.sumSin + next.sumSin;
  const avgCos = prev.sumCos + curr.sumCos + next.sumCos;
  const avgH = (Math.atan2(avgSin, avgCos) * (180 / Math.PI) + 360) % 360;

  return {
    c: Number(avgC.toFixed(3)),
    h: Number(avgH.toFixed(1)),
    l: Number(avgL.toFixed(3)),
  };
}

export function extractPaletteFromImage(
  imageSource: AmbientImageSource,
  options: AmbientExtractOptions = {},
): Promise<AmbientPalette> {
  const fallback = options.initialPalette || options.fallbackPalette || null;
  if (!imageSource || typeof window === "undefined") {
    return Promise.resolve(createDefaultPalette(fallback));
  }

  const srcKey =
    typeof imageSource === "string" ? imageSource : imageSource?.src || "";
  if (!srcKey) {
    return Promise.resolve(createDefaultPalette(fallback));
  }

  if (paletteCache.has(srcKey)) {
    return Promise.resolve(paletteCache.get(srcKey)!);
  }

  if (inFlightPromises.has(srcKey)) {
    return inFlightPromises.get(srcKey)!;
  }

  const extractionPromise = (async () => {
    let objectUrl: string | null = null;
    let sourceToLoad = srcKey;

    if (
      typeof window !== "undefined" &&
      typeof fetch === "function" &&
      srcKey.startsWith("http")
    ) {
      try {
        const corsUrl = srcKey.includes("cors=")
          ? srcKey
          : `${srcKey}${srcKey.includes("?") ? "&" : "?"}cors=1`;
        const res = await fetch(corsUrl, { mode: "cors" });
        if (res.ok) {
          const blob = await res.blob();
          objectUrl = URL.createObjectURL(blob);
          sourceToLoad = objectUrl;
        } else {
          throw new Error("Direct CORS fetch failed");
        }
      } catch {
        try {
          const proxyUrl = `/api/ambient/proxy?url=${encodeURIComponent(srcKey)}`;
          const proxyRes = await fetch(proxyUrl);
          if (proxyRes.ok) {
            const blob = await proxyRes.blob();
            objectUrl = URL.createObjectURL(blob);
            sourceToLoad = objectUrl;
          }
        } catch {
          sourceToLoad = srcKey;
        }
      }
    }

    const palette = await new Promise<AmbientPalette>((resolve) => {
      const img = new Image();
      if (!objectUrl) {
        img.crossOrigin = "anonymous";
      }

      const cleanup = () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
      };

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const size = COLOR_EXTRACT_CONFIG.sampleSize;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) {
            cleanup();
            resolve(createDefaultPalette(fallback));
            return;
          }

          ctx.drawImage(img, 0, 0, size, size);
          const imageData = ctx.getImageData(0, 0, size, size);
          cleanup();

          const sampled = sampleImageData(imageData);

          const clampedChroma = Math.max(
            COLOR_EXTRACT_CONFIG.minChroma,
            Math.min(COLOR_EXTRACT_CONFIG.maxChroma, sampled.c),
          );

          const blackChroma = Math.min(
            COLOR_EXTRACT_CONFIG.maxBlackChroma,
            Math.max(
              0.025,
              clampedChroma * COLOR_EXTRACT_CONFIG.blackChromaFactor,
            ),
          );
          const black = oklchToString(
            COLOR_EXTRACT_CONFIG.blackLightness,
            blackChroma,
            sampled.h,
          );

          const primaryChroma = Math.max(
            0.15,
            Math.min(0.24, Math.max(clampedChroma * 1.15, 0.18)),
          );
          const primary = oklchToString(
            COLOR_EXTRACT_CONFIG.primaryLightness,
            primaryChroma,
            sampled.h,
          );

          resolve({ black, primary });
        } catch {
          cleanup();
          resolve(createDefaultPalette(fallback));
        }
      };

      img.onerror = () => {
        cleanup();
        resolve(createDefaultPalette(fallback));
      };

      if (sourceToLoad) {
        img.src = sourceToLoad;
      } else {
        cleanup();
        resolve(createDefaultPalette(fallback));
      }
    });

    if (srcKey && palette) {
      if (paletteCache.size >= COLOR_EXTRACT_CONFIG.cacheLimit) {
        const firstKey = paletteCache.keys().next().value;
        if (firstKey) paletteCache.delete(firstKey);
      }
      paletteCache.set(srcKey, palette);
    }

    inFlightPromises.delete(srcKey);
    return palette;
  })().catch(() => {
    inFlightPromises.delete(srcKey);
    return createDefaultPalette(fallback);
  });

  inFlightPromises.set(srcKey, extractionPromise);
  return extractionPromise;
}

function createDefaultPalette(
  fallback: AmbientPalette | null = null,
): AmbientPalette {
  if (fallback && typeof fallback === "object") {
    return {
      black: fallback.black || AMBIENT_DEFAULTS.black,
      primary: fallback.primary || AMBIENT_DEFAULTS.primary,
    };
  }
  return {
    black: AMBIENT_DEFAULTS.black,
    primary: AMBIENT_DEFAULTS.primary,
  };
}

export function resolveTargetElement(
  target: AmbientTarget,
): HTMLElement | null {
  if (!target && typeof document !== "undefined") {
    return document.documentElement;
  }
  if (target && typeof target === "object" && "current" in target) {
    return target.current;
  }
  if (typeof target === "string" && typeof document !== "undefined") {
    return document.querySelector<HTMLElement>(target);
  }
  if (target instanceof HTMLElement) {
    return target;
  }
  return null;
}

export function normalizeColorMap(
  colors: Record<string, string> = {},
): Record<string, string> {
  const result: Record<string, string> = {};
  const cssVars = AMBIENT_CSS_VARS as Record<string, string>;
  for (const [key, value] of Object.entries(colors)) {
    if (!value) continue;
    const cssVarName =
      cssVars[key] ||
      (key.startsWith("--")
        ? key
        : cssVars[key.toLowerCase()] || `--color-${key}`);
    if (cssVarName) {
      result[cssVarName] = value;
    }
  }
  return result;
}

export function applyScopedCssVariables(
  target: AmbientTarget,
  varMap: Record<string, string> = {},
): () => void {
  const element = resolveTargetElement(target);
  if (!element || !element.style) return () => {};

  const appliedKeys: string[] = [];
  for (const [cssVar, val] of Object.entries(varMap)) {
    if (cssVar && val) {
      element.style.setProperty(cssVar, val);
      appliedKeys.push(cssVar);
    }
  }

  return function cleanup() {
    for (const cssVar of appliedKeys) {
      element.style.removeProperty(cssVar);
    }
  };
}

export function resolveAmbientVarMap({
  colors = null,
  extractedBlack = "",
  extractedPrimary = "",
  image = null,
  tintGlobals = true,
}: {
  colors?: Record<string, string> | null;
  extractedBlack?: string;
  extractedPrimary?: string;
  image?: AmbientImageSource;
  tintGlobals?: boolean;
}): Record<string, string> {
  const rawMap: Record<string, string> = {};

  if (image) {
    if (extractedPrimary) {
      rawMap[AMBIENT_CSS_VARS.primary] = extractedPrimary;
      rawMap[AMBIENT_CSS_VARS.ambientGlow] = extractedPrimary;
      if (tintGlobals) {
        rawMap[AMBIENT_CSS_VARS.info] = extractedPrimary;
        rawMap[AMBIENT_CSS_VARS.colorPrimary] = extractedPrimary;
      }
    }
    if (extractedBlack) {
      rawMap[AMBIENT_CSS_VARS.black] = extractedBlack;
    }
  }

  if (colors && typeof colors === "object") {
    const explicitVars = normalizeColorMap(colors);
    Object.assign(rawMap, explicitVars);
  }

  return rawMap;
}
