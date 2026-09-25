import type { BackgroundState } from "./types";

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

export const BG_TO_OBJECT_CLASS_MAP = Object.freeze({
  "bg-bottom": "object-bottom",
  "bg-center": "object-center",
  "bg-contain": "object-contain",
  "bg-cover": "object-cover",
  "bg-fill": "object-fill",
  "bg-left": "object-left",
  "bg-left-bottom": "object-left-bottom",
  "bg-left-top": "object-left-top",
  "bg-none": "object-none",
  "bg-right": "object-right",
  "bg-right-bottom": "object-right-bottom",
  "bg-right-top": "object-right-top",
  "bg-scale-down": "object-scale-down",
  "bg-top": "object-top",
} as const);

export const FIT_TO_OBJECT_CLASS_MAP = Object.freeze({
  contain: "object-contain",
  cover: "object-cover",
  fill: "object-fill",
  none: "object-none",
  "scale-down": "object-scale-down",
} as const);

export const DEFAULT_COLOR = "var(--black, #000)";
export const DEFAULT_NOISE_OPACITY = 0.04;
export const NOISE_IMAGE_URL = "url(/images/noise.webp)";
