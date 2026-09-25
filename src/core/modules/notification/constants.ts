export const TOAST_DURATIONS = Object.freeze({
  DEFAULT: 2000,
  SHORT: 1500,
} as const);

export const SESSION_EXPIRED_MESSAGE =
  "Your session has expired. Please sign in again";

export const DOCK_STACK_ELEMENT_ID = "dock-card-stack";

export const NOTIFICATION_STYLES = Object.freeze({
  CONTAINER:
    "pointer-events-auto flex h-[40px] w-full cursor-pointer items-center justify-center rounded-[20px] bg-black/60 px-4 text-xs font-medium text-white ring-1 ring-white/10 select-none ring-inset backdrop-blur-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50",
  DOCK_SLOT:
    "pointer-events-auto absolute inset-x-0 top-[calc(100%+4px)] z-20 flex h-[40px] w-full cursor-pointer items-center justify-center rounded-[20px] bg-black/60 px-4 text-xs font-medium text-white ring-1 ring-white/10 select-none ring-inset backdrop-blur-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50",
  FALLBACK_PORTAL_CONTAINER:
    "pointer-events-none fixed inset-x-0 bottom-2 mx-auto flex w-full max-w-[380px] flex-col items-center justify-center px-4",
  MESSAGE: "truncate text-center text-xs font-medium text-white",
} as const);
