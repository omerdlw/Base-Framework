export {
  AMBIENT_CSS_VARS,
  AMBIENT_DEFAULTS,
  AMBIENT_TRANSITION_CLASS,
  AMBIENT_TRANSITION_CLASSES,
  COLOR_EXTRACT_CONFIG,
} from "./constants";

export {
  applyScopedCssVariables,
  extractPaletteFromImage,
  normalizeColorMap,
  oklchToString,
  resolveTargetElement,
  rgbToOklch,
} from "./utils";

export { defineAmbient, defineTheme } from "./builder";

export {
  AmbientProvider,
  useAmbient,
  useAmbientColor,
  useAmbientTheme,
} from "./provider";

export type * from "./types";
