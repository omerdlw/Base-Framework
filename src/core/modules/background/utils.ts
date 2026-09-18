import { BG_TO_OBJECT_CLASS_MAP, BACKGROUND_PRESETS } from "./constants";
import type { BackgroundState, FadeEdges } from "./types";

export const generateBaseGradient = (
  direction: "left" | "right",
  color: string,
): string => {
  const to = direction === "left" ? "to right" : "to left";
  return `linear-gradient(${to}, ${color} 0%, color-mix(in srgb, ${color} 85%, transparent) 15%, color-mix(in srgb, ${color} 50%, transparent) 45%, color-mix(in srgb, ${color} 18%, transparent) 75%, transparent 100%)`;
};

export const generateEdgeGradient = (
  direction: "left" | "right",
  color: string,
): string => {
  const to = direction === "left" ? "to right" : "to left";
  return `linear-gradient(${to}, color-mix(in srgb, ${color} 95%, transparent) 0%, color-mix(in srgb, ${color} 70%, transparent) 25%, color-mix(in srgb, ${color} 35%, transparent) 55%, color-mix(in srgb, ${color} 10%, transparent) 80%, transparent 100%)`;
};

export function getVisualStyle(currentStyle: Record<string, unknown> = {}) {
  const { leftGradient = 0, rightGradient = 0, ...baseStyle } = currentStyle;
  return {
    baseStyle,
    leftGradient: Number(leftGradient) || 0,
    rightGradient: Number(rightGradient) || 0,
  };
}

export function applyVideoPlaybackState({
  isPlaying,
  playbackRate,
  setVideoPlaying,
  videoElement,
}: {
  isPlaying?: boolean;
  playbackRate?: number;
  setVideoPlaying: (playing: boolean) => void;
  videoElement?: HTMLVideoElement | null;
}): void {
  if (!videoElement) return;

  const numericPlaybackRate = Number(playbackRate);
  const resolvedPlaybackRate =
    Number.isFinite(numericPlaybackRate) && numericPlaybackRate > 0
      ? numericPlaybackRate
      : 1;

  try {
    if (videoElement.playbackRate !== resolvedPlaybackRate) {
      videoElement.playbackRate = resolvedPlaybackRate;
    }
  } catch {
    return;
  }

  if (!isPlaying) {
    if (!videoElement.paused) videoElement.pause();
    return;
  }

  const playPromise = videoElement.play();
  if (!playPromise || typeof playPromise.then !== "function") return;

  playPromise
    .then(() => setVideoPlaying(true))
    .catch((error) => {
      setVideoPlaying(false);
      console.warn("Autoplay / Play failed", error);
    });
}

export function resolveVideoClasses(...inputs: unknown[]): {
  customClasses: string;
  mappedClasses: string;
} {
  const customClasses = inputs
    .filter(Boolean)
    .flatMap((entry) =>
      typeof entry === "string"
        ? entry.replace(/,/g, " ").trim().split(/\s+/)
        : [],
    )
    .filter(Boolean);
  const mapped: string[] = [];
  for (const cls of customClasses) {
    const mappedVal = (BG_TO_OBJECT_CLASS_MAP as Record<string, string>)[cls];
    if (mappedVal) mapped.push(mappedVal);
  }
  return {
    customClasses: customClasses.join(" "),
    mappedClasses: mapped.join(" "),
  };
}

export function extractWidthClasses(className = ""): {
  nonWidthClasses: string;
  widthClasses: string;
} {
  if (!className || typeof className !== "string") {
    return {
      nonWidthClasses: "",
      widthClasses: "",
    };
  }
  const tokens = className
    .replace(/,/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const widthTokens: string[] = [];
  const otherTokens: string[] = [];
  for (const token of tokens) {
    if (/^(w-|max-w-|min-w-)/.test(token)) widthTokens.push(token);
    else otherTokens.push(token);
  }
  return {
    nonWidthClasses: otherTokens.join(" "),
    widthClasses: widthTokens.join(" "),
  };
}

export function resolveGradientSettings({
  fadeEdges = null,
  hasWidth = false,
  leftGradient = 0,
  rightGradient = 0,
}: {
  fadeEdges?: FadeEdges | number | string | boolean | null;
  hasWidth?: boolean;
  leftGradient?: number;
  rightGradient?: number;
}) {
  let leftPercent = 0;
  let rightPercent = 0;
  if (leftGradient > 0)
    leftPercent = Math.min(48, Math.max(12, leftGradient * 7.5));
  else if (hasWidth && fadeEdges !== false) leftPercent = 20;
  if (rightGradient > 0)
    rightPercent = Math.min(48, Math.max(12, rightGradient * 7.5));
  else if (hasWidth && fadeEdges !== false) rightPercent = 20;
  if (typeof fadeEdges === "number") {
    leftPercent = fadeEdges;
    rightPercent = fadeEdges;
  } else if (typeof fadeEdges === "string") {
    const parsed = parseFloat(fadeEdges);
    if (!Number.isNaN(parsed)) {
      leftPercent = parsed;
      rightPercent = parsed;
    }
  } else if (typeof fadeEdges === "object" && fadeEdges !== null) {
    const edgeObj = fadeEdges as { left?: unknown; right?: unknown };
    if (edgeObj.left !== undefined)
      leftPercent = parseFloat(String(edgeObj.left)) || 0;
    if (edgeObj.right !== undefined)
      rightPercent = parseFloat(String(edgeObj.right)) || 0;
  } else if (fadeEdges === false) {
    leftPercent = 0;
    rightPercent = 0;
  }
  const leftOpacity = leftGradient > 0 ? Math.min(1, leftGradient * 0.22) : 0;
  const rightOpacity =
    rightGradient > 0 ? Math.min(1, rightGradient * 0.22) : 0;
  return {
    enabled: leftPercent > 0 || rightPercent > 0,
    leftOpacity,
    leftPercent,
    rightOpacity,
    rightPercent,
  };
}

function generateSmoothstepStops(
  percent: number,
  direction: "in" | "out" = "in",
  color = "var(--black, #000)",
): string[] {
  const steps = [
    { s: 0, t: 0 },
    { s: 0.06, t: 0.15 },
    { s: 0.22, t: 0.35 },
    { s: 0.47, t: 0.55 },
    { s: 0.76, t: 0.75 },
    { s: 0.93, t: 0.9 },
    { s: 1.0, t: 1.0 },
  ];
  if (direction === "in") {
    return steps.map(({ s, t }) =>
      s === 0
        ? `transparent ${(t * percent).toFixed(1)}%`
        : s === 1
          ? `${color} ${(t * percent).toFixed(1)}%`
          : `color-mix(in srgb, ${color} ${Math.round(s * 100)}%, transparent) ${(t * percent).toFixed(1)}%`,
    );
  }
  return steps.map(({ s, t }) => {
    const alpha = 1 - s;
    return alpha === 0
      ? `transparent ${(100 - percent + t * percent).toFixed(1)}%`
      : alpha === 1
        ? `${color} ${(100 - percent + t * percent).toFixed(1)}%`
        : `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent) ${(100 - percent + t * percent).toFixed(1)}%`;
  });
}

export function getEdgeFadeMask({
  color = "var(--black, #000)",
  leftPercent = 0,
  rightPercent = 0,
}: {
  color?: string;
  leftPercent?: number;
  rightPercent?: number;
}): string | undefined {
  if (leftPercent <= 0 && rightPercent <= 0) return undefined;
  const leftStops =
    leftPercent > 0
      ? generateSmoothstepStops(leftPercent, "in", color)
      : [`${color} 0%`];
  const rightStops =
    rightPercent > 0
      ? generateSmoothstepStops(rightPercent, "out", color)
      : [`${color} 100%`];
  return `linear-gradient(to right, ${leftStops.join(", ")}, ${rightStops.join(", ")})`;
}

export function mergeBackgroundState(
  baseState: BackgroundState,
  patch: Partial<BackgroundState> = {},
): BackgroundState {
  const resolvedPatch =
    patch !== null && typeof patch === "object" ? patch : {};

  const presetValue = resolvedPatch.preset;
  const resolvedPreset =
    typeof presetValue === "string"
      ? (BACKGROUND_PRESETS as Record<string, Partial<BackgroundState>>)[
          presetValue.toUpperCase()
        ] || {}
      : presetValue && typeof presetValue === "object"
        ? presetValue
        : {};

  return {
    ...baseState,
    ...resolvedPreset,
    ...resolvedPatch,
    animation:
      resolvedPatch.animation !== undefined
        ? resolvedPatch.animation
          ? {
              ...(baseState.animation || {}),
              ...(resolvedPreset.animation || {}),
              ...resolvedPatch.animation,
            }
          : resolvedPatch.animation
        : resolvedPreset.animation !== undefined
          ? resolvedPreset.animation
          : baseState.animation,
    imageStyle: {
      ...baseState.imageStyle,
      ...(resolvedPreset.imageStyle || {}),
      ...(resolvedPatch.imageStyle || {}),
    },
    noiseStyle: {
      ...baseState.noiseStyle,
      ...(resolvedPreset.noiseStyle || {}),
      ...(resolvedPatch.noiseStyle || {}),
    },
    videoOptions: {
      ...baseState.videoOptions,
      ...(resolvedPreset.videoOptions || {}),
      ...(resolvedPatch.videoOptions || {}),
    },
    videoStyle: {
      ...baseState.videoStyle,
      ...(resolvedPreset.videoStyle || {}),
      ...(resolvedPatch.videoStyle || {}),
    },
  };
}
