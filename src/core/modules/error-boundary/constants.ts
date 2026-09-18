export const ERROR_MESSAGES = Object.freeze({
  GLOBAL_TITLE: "Application Error",
  GLOBAL_MSG: "Something went wrong. Please try again",
  MODULE_TITLE: "Module Error",
  MODULE_MSG: "This module encountered an unexpected error",
  COMPONENT_MSG: "Component failed to load",
  FALLBACK_TITLE: "An error occurred",
  FALLBACK_MSG: "Something went wrong while loading this component",
} as const);

export const ERROR_BOUNDARY_STYLES = Object.freeze({
  CONTAINER:
    "bg-error/5 ring-error/10 flex min-h-[300px] w-full flex-col items-center justify-center rounded-xl p-6 text-center ring-1 ring-inset",
  ICON_BOX:
    "bg-error/10 text-error mb-4 flex size-12 items-center justify-center rounded-full text-xl font-bold",
  TITLE: "text-foreground mb-1 text-lg font-semibold",
  DESC: "text-muted-foreground mb-4 max-w-md text-sm",
  BUTTON:
    "bg-error hover:bg-error/90 px-4 py-2 text-xs font-medium text-white transition-all duration-300 ease-in-out",
} as const);

export const MAX_CONTEXT = 10;
export const MAX_FINGERPRINTS = 100;
export const DEFAULT_DEDUPE_WINDOW = 60000;

export const DEFAULT_ERROR_MSG = "Unexpected error occurred";

export const ERROR_LISTENER_CONFIG = Object.freeze({
  maxErrors: 10,
  throttle: 2000,
  ignored: Object.freeze([
    /ResizeObserver loop/i,
    /Network request failed/i,
    /Loading chunk/i,
    /Unexpected end of input/i,
    /Failed to fetch/i,
    /Script error/i,
    /HTTP\s*404/i,
  ]),
} as const);
