"use client";

export { BackgroundOverlay, default as BackgroundOverlayDefault } from "./view";
export { default } from "./view";

export {
  BackgroundProvider,
  useBackgroundActions,
  useBackgroundState,
  useOptionalBackgroundActions,
} from "./provider";

export {
  BACKGROUND_PRESETS,
  DEFAULT_BACKGROUND,
  BG_TO_OBJECT_CLASS_MAP,
  FIT_TO_OBJECT_CLASS_MAP,
  DEFAULT_COLOR,
  DEFAULT_NOISE_OPACITY,
  NOISE_IMAGE_URL,
} from "./constants";

export {
  applyVideoPlaybackState,
  extractWidthClasses,
  generateBaseGradient,
  generateEdgeGradient,
  getEdgeFadeMask,
  getVisualStyle,
  mergeBackgroundState,
  resolveGradientSettings,
  resolveVideoClasses,
} from "./utils";

export {
  BACKGROUND_ANIMATE_PRESENCE_MODE,
  BACKGROUND_EXIT_EASE,
  BACKGROUND_OVERLAY_TRANSITION_PROPERTY,
  BACKGROUND_WILL_CHANGE,
  getBackgroundMotionConfig,
  toCssDelay,
  toCssDuration,
  toCssEasing,
} from "./motion";

export { defineBackground } from "./builder";
export { useBackground } from "@/core/orchestration";

export type * from "./types";
