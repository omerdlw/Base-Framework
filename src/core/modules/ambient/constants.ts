export const AMBIENT_CSS_VARS = Object.freeze({
  ambientGlow: "--color-ambient-glow",
  black: "--black",
  colorBlack: "--color-black",
  colorPrimary: "--color-primary",
  colorWhite: "--color-white",
  primary: "--primary",
  white: "--white",
} as const);

export const AMBIENT_DEFAULTS = Object.freeze({
  black: "#101010",
  primary: "#fcfcfb",
} as const);

export const COLOR_EXTRACT_CONFIG = Object.freeze({
  blackChromaFactor: 0.35,
  blackLightness: 0.15,
  cacheLimit: 100,
  maxBlackChroma: 0.055,
  maxChroma: 0.28,
  minChroma: 0.03,
  primaryLightness: 0.74,
  sampleSize: 32,
} as const);

export const AMBIENT_TRANSITION_CLASSES = Object.freeze([
  "transition-colors",
  "duration-500",
  "ease-out",
] as const);

export const AMBIENT_TRANSITION_CLASS =
  "transition-colors duration-500 ease-out";
