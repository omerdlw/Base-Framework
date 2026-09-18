import {
  DESTRUCTIVE_ACTION_TONE_CLASS,
  INFO_ACTION_TONE_CLASS,
  SEMANTIC_SURFACE_CLASSES,
  SUCCESS_ACTION_TONE_CLASS,
  WARNING_ACTION_TONE_CLASS,
} from "@/core/tokens";
import type {
  NotificationActions,
  NotificationPresetConfig,
  NotificationState,
} from "./types";

export const CRITICAL_TYPES = Object.freeze({
  OFFLINE: "OFFLINE",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  SERVER_ERROR: "SERVER_ERROR",
  SESSION_EXPIRED: "SESSION_EXPIRED",
} as const);

export const TOAST_TYPES = Object.freeze({
  ERROR: "ERROR",
  INFO: "INFO",
  SUCCESS: "SUCCESS",
  WARNING: "WARNING",
} as const);

export const TOAST_DURATIONS = Object.freeze({
  DEFAULT: 4000,
  SHORT: 3000,
} as const);

export const PRODUCTION_OPTIONAL_TOAST_TYPES = Object.freeze(
  new Set<string>([TOAST_TYPES.SUCCESS, TOAST_TYPES.INFO]),
);

export const SESSION_EXPIRED_MESSAGE =
  "Your session has expired. Please sign in again";
export const DRAG_DISMISS_THRESHOLD = 80;
export const DRAG_VELOCITY_THRESHOLD = 300;
export const STORAGE_KEY = "critical_notifications";
export const CRITICAL_SET = new Set<string>(Object.values(CRITICAL_TYPES));

export const FALLBACK_NOTIFICATION_ACTIONS: NotificationActions = Object.freeze(
  {
    dismissNotification: () => {},
    showNotification: () => {},
  },
);

export const FALLBACK_NOTIFICATION_STATE: NotificationState = Object.freeze({
  notifications: {},
});

export const NOTIFICATION_STYLES = Object.freeze({
  ACTION_BUTTON:
    "center w-full cursor-pointer gap-2.5 rounded-[20px] bg-white/5 px-4 py-2.5 text-xs font-semibold text-white/70 uppercase ring-1 ring-white/5 ring-inset hover:bg-white/10",
  CONTAINER:
    "pointer-events-auto relative w-full overflow-hidden rounded-none bg-black/80 p-2.5 ring-1 ring-white/10 backdrop-blur-lg transition-all duration-300 ease-in-out ring-inset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 sm:rounded-[30px]",
  DESCRIPTION: "text-sm wrap-break-word whitespace-normal",
  ICON_BOX:
    "center size-12 shrink-0 rounded-[20px] ring-1 ring-transparent ring-inset",
  MOTION_WRAPPER:
    "pointer-events-auto w-full cursor-grab touch-pan-y active:cursor-grabbing",
  PORTAL_CONTAINER:
    "pointer-events-none fixed top-0 right-0 left-0 mx-0 flex w-full max-w-none flex-col gap-2.5 overflow-visible p-0 sm:top-4 sm:right-4 sm:left-auto sm:mx-0 sm:max-w-[420px]",
  TITLE: "truncate text-base font-bold",
} as const);

export const NOTIFICATION_CONFIG: Record<string, NotificationPresetConfig> =
  Object.freeze({
    [CRITICAL_TYPES.OFFLINE]: Object.freeze({
      actionToneClass: WARNING_ACTION_TONE_CLASS,
      description: "You are currently offline",
      dismissible: false,
      icon: "solar:danger-triangle-bold",
      theme: SEMANTIC_SURFACE_CLASSES.warning,
      title: "Connection Lost",
      tone: "warning",
    }),
    [CRITICAL_TYPES.PERMISSION_DENIED]: Object.freeze({
      actionToneClass: DESTRUCTIVE_ACTION_TONE_CLASS,
      dismissible: true,
      icon: "solar:forbidden-circle-bold",
      theme: SEMANTIC_SURFACE_CLASSES.error,
      title: "Permission Denied",
      tone: "error",
    }),
    [CRITICAL_TYPES.SERVER_ERROR]: Object.freeze({
      actionToneClass: DESTRUCTIVE_ACTION_TONE_CLASS,
      dismissible: true,
      icon: "solar:danger-triangle-bold",
      theme: SEMANTIC_SURFACE_CLASSES.error,
      title: "Server Error",
      tone: "error",
    }),
    [CRITICAL_TYPES.SESSION_EXPIRED]: Object.freeze({
      actionToneClass: WARNING_ACTION_TONE_CLASS,
      dismissible: true,
      icon: "solar:danger-triangle-bold",
      theme: SEMANTIC_SURFACE_CLASSES.warning,
      title: "Session Expired",
      tone: "warning",
    }),
    [TOAST_TYPES.ERROR]: Object.freeze({
      actionToneClass: DESTRUCTIVE_ACTION_TONE_CLASS,
      dismissible: true,
      icon: "solar:danger-triangle-bold",
      theme: SEMANTIC_SURFACE_CLASSES.error,
      title: "Error",
      tone: "error",
    }),
    [TOAST_TYPES.INFO]: Object.freeze({
      actionToneClass: INFO_ACTION_TONE_CLASS,
      dismissible: true,
      icon: "solar:info-circle-bold",
      theme: SEMANTIC_SURFACE_CLASSES.info,
      title: "Info",
      tone: "info",
    }),
    [TOAST_TYPES.SUCCESS]: Object.freeze({
      actionToneClass: SUCCESS_ACTION_TONE_CLASS,
      dismissible: true,
      icon: "material-symbols:check-rounded",
      theme: SEMANTIC_SURFACE_CLASSES.success,
      title: "Success",
      tone: "success",
    }),
    [TOAST_TYPES.WARNING]: Object.freeze({
      actionToneClass: WARNING_ACTION_TONE_CLASS,
      dismissible: true,
      icon: "solar:danger-triangle-bold",
      theme: SEMANTIC_SURFACE_CLASSES.warning,
      title: "Warning",
      tone: "warning",
    }),
  });
