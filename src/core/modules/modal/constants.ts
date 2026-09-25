export const MODAL_POSITIONS = Object.freeze({
  BOTTOM: "bottom",
  CENTER: "center",
  LEFT: "left",
  RIGHT: "right",
  TOP: "top",
} as const);

export const MODAL_POSITION_CLASSES = Object.freeze({
  [MODAL_POSITIONS.CENTER]: "items-center justify-center",
  [MODAL_POSITIONS.TOP]: "items-center justify-start",
  [MODAL_POSITIONS.BOTTOM]: "items-center justify-end",
  [MODAL_POSITIONS.LEFT]: "items-start justify-start",
  [MODAL_POSITIONS.RIGHT]: "items-end justify-start",
} as const);

export const MODAL_CHROME = Object.freeze({
  BARE: "bare",
  PANEL: "panel",
} as const);

export const MODAL_BREAKPOINTS = Object.freeze({
  MOBILE_MAX_WIDTH: 639,
} as const);

export const SMOOTH_SCROLL_LOCK_EVENT = "modal:smooth-scroll-lock";

export const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

export const HEIGHT_CONSTRAINT_PATTERN = /(\s|^)(?:[\w-]+:)*(?:h|max-h)-/;

export const MODAL_STYLES = Object.freeze({
  CLOSE_BTN:
    "center inline-flex size-8 cursor-pointer rounded-[20px] bg-white/5 text-white/70 ring-1 ring-white/5 ring-inset hover:bg-white hover:text-black hover:ring-transparent active:scale-95 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:outline-none",
  HEADER_LAYOUT: "items-center gap-2.5 px-4 py-3",
  LAYER_SWITCHER:
    "center shrink-0 gap-2 border-t border-white/10 bg-white/5 p-2.5",
  PANEL_BARE:
    "overflow-visible bg-transparent ring-1 ring-transparent ring-inset",
  PANEL_BASE: "modal-panel relative flex flex-col",
  PANEL_CHROME:
    "overflow-hidden bg-black/60 shadow-[0_18px_56px_rgba(0,0,0,0.50)] ring-1 ring-white/10 backdrop-blur-lg ring-inset",
} as const);
