"use client";

export { BackgroundOverlay, default as BackgroundOverlayDefault } from "./view";
export { default } from "./view";

export {
  BackgroundProvider,
  useBackground,
  useBackgroundActions,
  useBackgroundState,
} from "./provider";

export {
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
  normalizeBackgroundInput,
  resolveGradientSettings,
  resolveVideoClasses,
} from "./utils";

export {
  createYouTubeVideoElementProxy,
  extractYouTubeVideoId,
  getYouTubeStreamUrl,
  getYouTubeThumbnailUrl,
  isDirectVideoUrl,
  isYouTubeUrl,
  parseYouTubeTimeParam,
  parseYouTubeUrlConfig,
  type YouTubeProxyController,
  type YouTubeUrlConfig,
} from "./youtube";

export {
  YouTubeBackgroundPlayer,
  type YouTubeBackgroundPlayerProps,
} from "./youtube-player";

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
export { useBackgroundRegistration } from "@/core/orchestration";

export type * from "./types";
