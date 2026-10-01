import { defineThemeSpec } from "../theme";
import { type BackgroundState, type BackgroundThemeSlot } from "./types";

export const DEFAULT_BACKGROUND: BackgroundState = Object.freeze({
  animation: null,
  className: "",
  fadeEdges: null,
  fit: null,
  image: null,
  imageStyle: {},
  isPlaying: false,
  noiseStyle: {},
  overlay: false,
  overlayColor: "var(--black)",
  overlayOpacity: 0,
  position: "center",
  video: null,
  videoClassName: "",
  videoElement: null,
  videoOptions: {
    autoplay: true,
    className: "",
    corp: 0,
    loop: false,
    muted: true,
    playbackRate: 1,
    width: null,
  },
  videoStyle: {},
  width: null,
});

export const BG_TOKEN_TO_OBJECT_SLOT = Object.freeze({
  "bg-bottom": "objectBottom",
  "bg-center": "objectCenter",
  "bg-contain": "objectContain",
  "bg-cover": "objectCover",
  "bg-fill": "objectFill",
  "bg-left": "objectLeft",
  "bg-left-bottom": "objectLeftBottom",
  "bg-left-top": "objectLeftTop",
  "bg-none": "objectNone",
  "bg-right": "objectRight",
  "bg-right-bottom": "objectRightBottom",
  "bg-right-top": "objectRightTop",
  "bg-scale-down": "objectScaleDown",
  "bg-top": "objectTop",
} as const);

export const FIT_TO_OBJECT_SLOT = Object.freeze({
  contain: "fitContain",
  cover: "fitCover",
  fill: "fitFill",
  none: "fitNone",
  "scale-down": "fitScaleDown",
} as const);

export const DEFAULT_COLOR = "var(--black, #000)";

export const backgroundTheme =
  defineThemeSpec<BackgroundThemeSlot>("background");

export const BACKGROUND_REGISTRY_KEY = "page-background";
