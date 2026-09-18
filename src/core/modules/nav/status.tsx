"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { DESTRUCTIVE_ACTION_TONE_CLASS } from "@/core/tokens";
import { EVENT_TYPES, globalEvents } from "@/core/events";
import { cn } from "@/core/utils";
import { Spinner } from "@/core/primitives/spinner";
import { Button, Icon } from "@/core/primitives";

import {
  API_ERROR_BATCH_DELAY,
  AUTH_STATUS_CLEAR_DURATION,
  AUTH_STATUS_STORAGE_KEY,
  AUTH_STATUS_TYPES,
  ERROR_STATUS_TYPES,
  NAV_ACTION_STYLES,
  SEMANTIC_SURFACE_CLASSES,
  STATUS_CLEAR_DURATION,
  STATUS_PRIORITY,
  STATUS_TONES,
} from "./constants";
import {
  getNavActionClass,
  isImageIconSource,
  normalizeLower,
  normalizeUpper,
} from "./utils";
import { NAV_FADE_TRANSITION, textCrossfadeVariants } from "./motion";

const ButtonComponent = Button as any;
const IconComponent = Icon as any;
const SpinnerComponent = Spinner as any;

export { normalizeLower, normalizeUpper };

export const AUTH_LAST_ACCOUNT_STORAGE_KEY = "nav_last_known_account_v2";

function readSessionStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;

    window.sessionStorage.setItem("test", "1");
    window.sessionStorage.removeItem("test");
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveLastKnownAccount(data: any): void {
  const storage = readSessionStorage();
  if (!storage || !data) return;
  try {
    const payload = {
      id: data.id || null,
      displayName: data.displayName || data.display_name || null,
      username: data.username || data.user_name || null,
      avatarUrl: data.avatarUrl || data.avatar_url || null,
      email: data.email || null,
    };
    storage.setItem(AUTH_LAST_ACCOUNT_STORAGE_KEY, JSON.stringify(payload));
  } catch {}
}

export function readLastKnownAccount(
  expectedUserId: string | null = null,
): any {
  const storage = readSessionStorage();
  if (!storage) return null;
  try {
    storage.removeItem("nav_last_known_account");
    const raw = storage.getItem(AUTH_LAST_ACCOUNT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (expectedUserId && parsed?.id && parsed.id !== expectedUserId)
      return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLastKnownAccount(): void {
  const storage = readSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(AUTH_LAST_ACCOUNT_STORAGE_KEY);
    storage.removeItem("nav_last_known_account");
  } catch {}
}

function clearPersistedAuthStatus(): void {
  try {
    readSessionStorage()?.removeItem(AUTH_STATUS_STORAGE_KEY);
  } catch {}
}

function persistAuthStatus(status: any, duration: number): void {
  const storage = readSessionStorage();
  if (!isPersistableAuthStatus(status) || !storage) return;
  try {
    storage.setItem(
      AUTH_STATUS_STORAGE_KEY,
      JSON.stringify({
        description: status.description || "",
        expiresAt: Date.now() + Math.max(0, Number(duration) || 0),
        flow: status.flow || null,
        icon: status.icon || null,
        priority: resolveStatusPriority(status),
        title: status.title || "",
        type: status.type,
      }),
    );
  } catch {}
}

function restorePersistedAuthStatus(): {
  remainingMs: number;
  status: any;
} | null {
  const storage = readSessionStorage();
  if (!storage) return null;
  try {
    const rawValue = storage.getItem(AUTH_STATUS_STORAGE_KEY);
    if (!rawValue) return null;

    const payload = JSON.parse(rawValue);
    const type = normalizeUpper(payload?.type);
    const expiresAt = Number(payload?.expiresAt || 0);

    if (
      !AUTH_STATUS_TYPES.has(type) ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      clearPersistedAuthStatus();
      return null;
    }

    return {
      remainingMs: expiresAt - Date.now(),
      status: createOverlayStatus({
        type,
        flow: payload?.flow || null,
        priority: Number.isFinite(Number(payload?.priority))
          ? Number(payload.priority)
          : null,
        title: payload?.title || "Account",
        description: payload?.description || "",
        icon: payload?.icon || null,
        style: getStatusTheme(type),
      }),
    };
  } catch {
    clearPersistedAuthStatus();
    return null;
  }
}

function isErrorStatus(type: string): boolean {
  return ERROR_STATUS_TYPES.has(type);
}

function getStatusPriority(type: string): number {
  return STATUS_PRIORITY[type] ?? 0;
}

function resolveStatusPriority(status: any): number {
  if (!status) return 0;
  const explicitPriority = Number(status.priority);
  return Number.isFinite(explicitPriority)
    ? explicitPriority
    : getStatusPriority(status.type);
}

function getStatusTone(type: string): string {
  return STATUS_TONES[type] || "info";
}

export function getStatusTheme(type: string) {
  const semanticTone =
    (SEMANTIC_SURFACE_CLASSES as any)[getStatusTone(type)] ||
    SEMANTIC_SURFACE_CLASSES.info;
  return {
    card: { className: semanticTone.surface },
    icon: { className: semanticTone.icon },
    title: { className: semanticTone.title },
    description: { className: semanticTone.description, opacity: 1 },
  };
}

function isPersistableAuthStatus(status: any): boolean {
  return (
    Boolean(status) &&
    AUTH_STATUS_TYPES.has(status.type) &&
    (typeof status.icon === "string" || status.icon == null)
  );
}

function isEquivalentAuthStatus(currentStatus: any, nextStatus: any): boolean {
  return (
    Boolean(currentStatus) &&
    AUTH_STATUS_TYPES.has(nextStatus?.type) &&
    currentStatus.type === nextStatus.type &&
    currentStatus.flow === nextStatus.flow &&
    currentStatus.title === nextStatus.title &&
    currentStatus.description === nextStatus.description &&
    currentStatus.icon === nextStatus.icon &&
    currentStatus.isOverlay === nextStatus.isOverlay
  );
}

function createOverlayStatus({
  type,
  title,
  description,
  icon,
  style,
  isOverlay = true,
  action = null,
  actions = null,
  flow = null,
  priority = null,
}: {
  type: string;
  title: string;
  description: string;
  icon?: any;
  style?: any;
  isOverlay?: boolean;
  action?: any;
  actions?: any;
  flow?: string | null;
  priority?: number | null;
}) {
  return {
    type,
    flow,
    isOverlay,
    priority,
    title,
    description,
    icon,
    style,
    action,
    actions,
    hideScroll: true,
  };
}

export function ErrorActions({
  onRetry,
  onRefresh,
  retryLabel = "Retry",
  refreshLabel = "Refresh",
  retryText,
  refreshText,
  className = "",
}: {
  onRetry?: () => void;
  onRefresh?: () => void;
  retryLabel?: string;
  refreshLabel?: string;
  retryText?: string;
  refreshText?: string;
  className?: string;
}) {
  const effectiveRetry = retryLabel || retryText || "Retry";
  const effectiveRefresh = refreshLabel || refreshText || "Refresh";
  return (
    <motion.div
      variants={textCrossfadeVariants}
      initial="hidden"
      animate="visible"
      transition={NAV_FADE_TRANSITION}
      className={cn(NAV_ACTION_STYLES.row, className)}
    >
      <ButtonComponent
        type="button"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onRefresh?.();
        }}
        className={getNavActionClass({
          variant: NAV_ACTION_STYLES.muted,
          className: "min-w-0 flex-1 justify-center whitespace-nowrap",
        })}
      >
        <span className="truncate">{effectiveRefresh}</span>
      </ButtonComponent>
      <ButtonComponent
        type="button"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onRetry?.();
        }}
        className={getNavActionClass({
          variant: DESTRUCTIVE_ACTION_TONE_CLASS,
          className: "min-w-0 flex-1 justify-center whitespace-nowrap",
        })}
      >
        <span className="truncate">{effectiveRetry}</span>
      </ButtonComponent>
    </motion.div>
  );
}
export const ErrorAction = ErrorActions;

export function GuardActions({
  onCancel,
  onConfirm,
  cancelLabel = "Stay",
  confirmLabel = "Leave",
  cancelText,
  confirmText,
  className = "",
}: {
  onCancel?: () => void;
  onConfirm?: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  cancelText?: string;
  confirmText?: string;
  className?: string;
}) {
  const effectiveCancel = cancelLabel || cancelText || "Stay";
  const effectiveConfirm = confirmLabel || confirmText || "Leave";
  return (
    <motion.div
      variants={textCrossfadeVariants}
      initial="hidden"
      animate="visible"
      transition={NAV_FADE_TRANSITION}
      className={cn(NAV_ACTION_STYLES.row, className)}
    >
      <ButtonComponent
        type="button"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onCancel?.();
        }}
        className={getNavActionClass({
          variant: NAV_ACTION_STYLES.muted,
          className: "min-w-0 flex-1 justify-center whitespace-nowrap",
        })}
      >
        <span className="truncate">{effectiveCancel}</span>
      </ButtonComponent>
      <ButtonComponent
        type="button"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onConfirm?.();
        }}
        className={getNavActionClass({
          variant: DESTRUCTIVE_ACTION_TONE_CLASS,
          className: "min-w-0 flex-1 justify-center whitespace-nowrap",
        })}
      >
        <span className="truncate">{effectiveConfirm}</span>
      </ButtonComponent>
    </motion.div>
  );
}
export const GuardAction = GuardActions;

export function createErrorStatus({
  type,
  title,
  description,
  icon,
  style,
  onRetry,
  clearStatus,
  action,
  errorAction,
  retryLabel,
  refreshLabel,
  retryText,
  refreshText,
}: {
  type: string;
  title: string;
  description: string;
  icon?: any;
  style?: any;
  onRetry?: () => void;
  clearStatus?: () => void;
  action?: any;
  errorAction?: any;
  retryLabel?: string;
  refreshLabel?: string;
  retryText?: string;
  refreshText?: string;
}) {
  const retryHandler =
    typeof onRetry === "function"
      ? () => {
          clearStatus?.();
          onRetry();
        }
      : () => {
          window.location.reload();
        };
  const ActionComponent = action || errorAction || ErrorActions;
  return createOverlayStatus({
    type,
    title,
    description,
    icon,
    style,
    isOverlay: true,
    action: () => (
      <ActionComponent
        onRetry={retryHandler}
        onRefresh={() => window.location.reload()}
        retryLabel={retryLabel}
        refreshLabel={refreshLabel}
        retryText={retryText}
        refreshText={refreshText}
      />
    ),
  });
}

export function createGuardStatus({
  action,
  guardAction,
  title = "Navigation Blocked",
  description = "You have unsaved changes. Are you sure you want to leave?",
  icon = "solar:danger-triangle-bold",
  style,
  onConfirm,
  onCancel,
  cancelLabel,
  confirmLabel,
  cancelText = "Stay",
  confirmText = "Leave",
  clearStatus,
}: {
  action?: any;
  guardAction?: any;
  title?: string;
  description?: string;
  icon?: any;
  style?: any;
  onConfirm?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  cancelText?: string;
  confirmText?: string;
  clearStatus?: () => void;
}) {
  const cancelHandler = () => {
    clearStatus?.();
    onCancel?.();
  };
  const confirmHandler = () => {
    clearStatus?.();
    onConfirm?.();
  };
  const effectiveCancel = cancelLabel || cancelText;
  const effectiveConfirm = confirmLabel || confirmText;
  const GuardActionComponent = action || guardAction || GuardActions;
  return createOverlayStatus({
    type: "GUARD",
    priority: STATUS_PRIORITY.GUARD,
    title,
    description,
    icon,
    style: style || getStatusTheme("GUARD"),
    isOverlay: true,
    action: () => (
      <GuardActionComponent
        onCancel={cancelHandler}
        onConfirm={confirmHandler}
        cancelLabel={effectiveCancel}
        confirmLabel={effectiveConfirm}
        cancelText={effectiveCancel}
        confirmText={effectiveConfirm}
      />
    ),
  });
}

function createProgressIcon() {
  return <SpinnerComponent size={24} />;
}
function createSuccessIcon() {
  return "material-symbols:check-rounded";
}

function resolveFeedbackIcon({
  phase,
  icon = null,
}: {
  phase?: string;
  icon?: any;
}) {
  if (phase === "start") return createProgressIcon();
  if (phase === "success") return createSuccessIcon();
  return icon;
}

function createConnectionStatus(type: string) {
  if (type === "OFFLINE") {
    return createOverlayStatus({
      type,
      title: "Connection Lost",
      description: "You are currently offline",
      icon: <IconComponent icon="lucide:wifi-off" size={24} />,
      style: getStatusTheme(type),
    });
  }
  return createOverlayStatus({
    type: "ONLINE",
    title: "Connection Restored",
    description: "You are back online",
    icon: <IconComponent icon="lucide:wifi" size={24} />,
    style: getStatusTheme("ONLINE"),
    isOverlay: false,
  });
}

export function resolveAuthIcon({
  account = null,
  user = null,
  type,
}: {
  account?: any;
  user?: any;
  type?: string;
}) {
  const cached = readLastKnownAccount(user?.id);
  const avatarCandidate =
    account?.avatarUrl || account?.avatar_url || cached?.avatarUrl || null;

  if (
    typeof avatarCandidate === "string" &&
    avatarCandidate.trim() &&
    isImageIconSource(avatarCandidate.trim())
  ) {
    return avatarCandidate.trim();
  }

  const isSignOut = type === "LOGOUT" || type === "ACCOUNT_DELETE";
  return isSignOut ? "solar:logout-2-bold" : "solar:login-2-bold";
}

export function resolveAuthStatusDetails({
  account = null,
  user = null,
  type,
  fallbackTitle = "Account",
  defaultDescription = "",
}: {
  account?: any;
  user?: any;
  type?: string;
  fallbackTitle?: string;
  defaultDescription?: string;
}) {
  const cached = readLastKnownAccount(user?.id);
  const uMeta = user?.user_metadata || {};

  const rawDisplayName =
    account?.displayName ||
    account?.display_name ||
    uMeta.displayName ||
    uMeta.display_name ||
    uMeta.full_name ||
    uMeta.name ||
    user?.name ||
    cached?.displayName ||
    "";
  const rawUsername =
    account?.username || account?.user_name || cached?.username || "";

  const cleanUsername = String(rawUsername || "")
    .trim()
    .replace(/^@+/, "");
  const formattedUsername = cleanUsername ? `@${cleanUsername}` : "";

  let title = String(rawDisplayName || "").trim();
  if (!title) {
    if (formattedUsername) title = cleanUsername;
    else if (user?.email || account?.email || cached?.email)
      title = user?.email || account?.email || cached?.email;
    else title = fallbackTitle;
  }

  const isSignOut = type === "LOGOUT" || type === "ACCOUNT_DELETE";
  const defaultActionText = isSignOut
    ? type === "ACCOUNT_DELETE"
      ? "Account deleted"
      : "Signed out"
    : type === "SIGNUP"
      ? "Setting up account"
      : "Signed in";

  let description = defaultDescription || defaultActionText;

  if (formattedUsername) {
    const isSameAsTitle =
      title.toLowerCase() === formattedUsername.toLowerCase() ||
      title.toLowerCase() === cleanUsername.toLowerCase();
    description = isSameAsTitle ? defaultActionText : formattedUsername;
  }

  return { title, description, icon: resolveAuthIcon({ account, user, type }) };
}

function createAuthStatus({
  type,
  user = null,
  account = null,
  titleFallback = "Account",
  description: explicitDescription,
  flow = null,
}: {
  type: string;
  user?: any;
  account?: any;
  titleFallback?: string;
  description?: string;
  flow?: string | null;
}) {
  const resolved = resolveAuthStatusDetails({
    account,
    user,
    type,
    fallbackTitle: titleFallback,
    defaultDescription: explicitDescription,
  });
  if (account) saveLastKnownAccount(account);
  return createOverlayStatus({
    type,
    flow,
    title: resolved.title,
    description: resolved.description,
    icon: resolved.icon,
    style: getStatusTheme(type),
  });
}

function normalizeAuthFeedback(eventData: any = {}) {
  const phase = normalizeLower(eventData?.phase);
  const flow = normalizeLower(eventData?.flow);
  return {
    flow,
    phase,
    statusType: normalizeUpper(
      eventData?.statusType || flow || "AUTH_FEEDBACK",
    ),
  };
}

function createAuthFeedbackStatus(eventData: any = {}) {
  const { flow, phase, statusType } = normalizeAuthFeedback(eventData);
  if (!phase) return null;
  return createOverlayStatus({
    type: statusType,
    flow,
    priority: eventData?.priority ?? STATUS_PRIORITY.LOGIN,
    title: eventData?.title || "Account",
    description: eventData?.description || "",
    icon: resolveFeedbackIcon({ phase, icon: eventData?.icon || null }),
    style: eventData?.style || getStatusTheme(eventData?.themeType || "LOGIN"),
    isOverlay: eventData?.isOverlay !== false,
  });
}

function subscribeToApiErrorStatusEvents({
  apiErrorQueueRef,
  batchTimerRef,
  clearStatus,
  clearTimer,
  updateStatus,
}: {
  apiErrorQueueRef: React.MutableRefObject<any[]>;
  batchTimerRef: React.MutableRefObject<any>;
  clearStatus: () => void;
  clearTimer: (ref: React.MutableRefObject<any>) => void;
  updateStatus: (status: any) => void;
}) {
  return globalEvents.subscribe(EVENT_TYPES.API_ERROR, (eventData: any) => {
    const { status: errorStatus, message, isCritical, retry } = eventData || {};
    if (!isCritical) return;

    apiErrorQueueRef.current.push({ status: errorStatus, message, retry });
    clearTimer(batchTimerRef);

    batchTimerRef.current = setTimeout(() => {
      const errors = [...apiErrorQueueRef.current];
      apiErrorQueueRef.current = [];
      if (errors.length === 0) return;

      const isBatch = errors.length > 1;
      const title = isBatch
        ? "Multiple API Errors"
        : `API Error (${errors[0].status || "Network"})`;
      const description = isBatch
        ? `${errors.length} requests failed`
        : errors[0].message || "An error occurred during the request";

      updateStatus(
        createErrorStatus({
          type: "API_ERROR",
          title,
          description,
          icon: "solar:danger-triangle-bold",
          onRetry: () => errors.forEach((e) => e.retry?.()),
          style: getStatusTheme("API_ERROR"),
          clearStatus,
        }),
      );
    }, API_ERROR_BATCH_DELAY);
  });
}

function subscribeToApplicationErrorStatusEvents({
  clearStatus,
  dispatchOfflineEvent,
  updateStatus,
}: {
  clearStatus: () => void;
  dispatchOfflineEvent: () => void;
  updateStatus: (status: any) => void;
}) {
  return globalEvents.subscribe(EVENT_TYPES.APP_ERROR, (eventData: any) => {
    const { message, error, resetError } = eventData || {};
    updateStatus(
      createErrorStatus({
        type: "APP_ERROR",
        title: error?.name || "Application Error",
        description:
          error?.message || message || "An unexpected error occurred",
        icon: "solar:danger-triangle-bold",
        onRetry: resetError
          ? () => {
              resetError();
              if (typeof navigator !== "undefined" && !navigator.onLine)
                dispatchOfflineEvent();
            }
          : undefined,
        style: getStatusTheme("APP_ERROR"),
        clearStatus,
      }),
    );
  });
}

function subscribeToSignOutStatusEvents({
  scheduleStatusClear,
  updateStatus,
}: {
  scheduleStatusClear: (options?: any) => void;
  updateStatus: (status: any) => void;
}) {
  return globalEvents.subscribe(EVENT_TYPES.AUTH_SIGN_OUT, (eventData: any) => {
    const isAccountDelete = eventData?.reason === "delete-account";
    const user = eventData?.previousSession?.user || null;
    const account =
      eventData?.previousAccount ||
      eventData?.account ||
      readLastKnownAccount(user?.id) ||
      null;

    if (!user && !account && !isAccountDelete) return;

    const type = isAccountDelete ? "ACCOUNT_DELETE" : "LOGOUT";
    const nextStatus = createAuthStatus({
      type,
      user,
      account,
      description: isAccountDelete ? "Account deleted" : "Signed out",
    });

    updateStatus(nextStatus);
    scheduleStatusClear({
      duration: AUTH_STATUS_CLEAR_DURATION,
      clearWhen: [type],
    });

    if (!isAccountDelete)
      persistAuthStatus(nextStatus, AUTH_STATUS_CLEAR_DURATION);
    clearLastKnownAccount();
  });
}

function subscribeToAccountDeletionStatusEvents({
  clearTimer,
  statusClearTimerRef,
  setStatus,
  updateStatus,
}: {
  clearTimer: (ref: React.MutableRefObject<any>) => void;
  statusClearTimerRef: React.MutableRefObject<any>;
  setStatus: React.Dispatch<React.SetStateAction<any>>;
  updateStatus: (status: any) => void;
}) {
  const unsubscribeStart = globalEvents.subscribe(
    EVENT_TYPES.AUTH_ACCOUNT_DELETE_START,
    (eventData: any) => {
      clearTimer(statusClearTimerRef);
      updateStatus(
        createOverlayStatus({
          type: "ACCOUNT_DELETE",
          title: eventData?.user?.name || eventData?.user?.email || "Account",
          description: "Deleting account. This may take a few seconds",
          icon: createProgressIcon(),
          style: getStatusTheme("ACCOUNT_DELETE"),
        }),
      );
    },
  );

  const unsubscribeEnd = globalEvents.subscribe(
    EVENT_TYPES.AUTH_ACCOUNT_DELETE_END,
    (eventData: any) => {
      if (eventData?.status !== "failure") return;
      clearTimer(statusClearTimerRef);
      setStatus((currentStatus: any) =>
        currentStatus?.type === "ACCOUNT_DELETE" ? null : currentStatus,
      );
    },
  );

  return () => {
    unsubscribeStart();
    unsubscribeEnd();
  };
}

function subscribeToSignInStatusEvents({
  scheduleStatusClear,
  updateStatus,
}: {
  scheduleStatusClear: (options?: any) => void;
  updateStatus: (status: any) => void;
}) {
  return globalEvents.subscribe(EVENT_TYPES.AUTH_SIGN_IN, (eventData: any) => {
    const user = eventData?.session?.user;
    if (!user) return;

    const account = eventData?.account || readLastKnownAccount(user.id) || null;
    const nextStatus = createAuthStatus({
      type: "LOGIN",
      user,
      account,
      titleFallback: "User",
    });

    updateStatus(nextStatus);
    scheduleStatusClear({
      duration: AUTH_STATUS_CLEAR_DURATION,
      clearWhen: ["LOGIN"],
    });
    persistAuthStatus(nextStatus, AUTH_STATUS_CLEAR_DURATION);

    if (typeof window !== "undefined" && !eventData?.account) {
      fetch("/api/account/me", { credentials: "same-origin" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const freshAccount = data?.account || data?.profile;
          if (freshAccount) {
            saveLastKnownAccount(freshAccount);
            updateStatus((currentStatus: any) => {
              if (
                !currentStatus ||
                (currentStatus.type !== "LOGIN" &&
                  currentStatus.type !== "SIGNUP")
              )
                return currentStatus;
              const enhancedStatus = createAuthStatus({
                type: currentStatus.type,
                user,
                account: freshAccount,
                titleFallback: "User",
                flow: currentStatus.flow,
              });
              persistAuthStatus(enhancedStatus, AUTH_STATUS_CLEAR_DURATION);
              return enhancedStatus;
            });
            scheduleStatusClear({
              duration: AUTH_STATUS_CLEAR_DURATION,
              clearWhen: ["LOGIN", "SIGNUP"],
            });
          }
        })
        .catch(() => {});
    }
  });
}

function subscribeToSignUpStatusEvents({
  scheduleStatusClear,
  updateStatus,
}: {
  scheduleStatusClear: (options?: any) => void;
  updateStatus: (status: any) => void;
}) {
  return globalEvents.subscribe(EVENT_TYPES.AUTH_SIGN_UP, (eventData: any) => {
    const user = eventData?.session?.user;
    if (!user) return;
    const account = eventData?.account || readLastKnownAccount(user.id) || null;
    const nextStatus = createAuthStatus({
      type: "SIGNUP",
      user,
      account,
      description: "Setting up account",
    });
    updateStatus(nextStatus);
    scheduleStatusClear({
      duration: AUTH_STATUS_CLEAR_DURATION,
      clearWhen: ["SIGNUP"],
    });
    persistAuthStatus(nextStatus, AUTH_STATUS_CLEAR_DURATION);
  });
}

function subscribeToAuthFeedbackStatusEvents({
  clearTimer,
  scheduleStatusClear,
  setStatus,
  statusClearTimerRef,
  updateStatus,
}: {
  clearTimer: (ref: React.MutableRefObject<any>) => void;
  scheduleStatusClear: (options?: any) => void;
  setStatus: React.Dispatch<React.SetStateAction<any>>;
  statusClearTimerRef: React.MutableRefObject<any>;
  updateStatus: (status: any) => void;
}) {
  return globalEvents.subscribe(EVENT_TYPES.AUTH_FEEDBACK, (eventData: any) => {
    const { flow, phase, statusType } = normalizeAuthFeedback(eventData);
    if (!phase) return;

    if (phase === "clear" || phase === "failure") {
      clearTimer(statusClearTimerRef);
      setStatus((currentStatus: any) => {
        if (!currentStatus) return currentStatus;
        if (flow && currentStatus.flow === flow) return null;
        return currentStatus.type === statusType ? null : currentStatus;
      });
      return;
    }

    updateStatus(createAuthFeedbackStatus(eventData));
    if (phase === "success") {
      scheduleStatusClear({
        duration:
          Number(eventData?.duration) > 0
            ? Number(eventData.duration)
            : AUTH_STATUS_CLEAR_DURATION,
        clearWhen: [statusType],
      });
      return;
    }
    clearTimer(statusClearTimerRef);
  });
}

function subscribeToNotFoundStatusEvents({
  notFoundActionRef,
  setStatus,
  updateStatus,
}: {
  notFoundActionRef: React.RefObject<ComponentType<any> | null>;
  setStatus: React.Dispatch<React.SetStateAction<any>>;
  updateStatus: (status: any) => void;
}) {
  return globalEvents.subscribe(EVENT_TYPES.NAV_NOT_FOUND, (eventData: any) => {
    if (eventData?.clear) {
      setStatus((currentStatus: any) =>
        currentStatus?.type === "NOT_FOUND" ? null : currentStatus,
      );
      return;
    }
    const currentNotFoundAction = notFoundActionRef.current;
    updateStatus({
      type: "NOT_FOUND",
      path: "not-found",
      isOverlay: true,
      title: eventData?.title || "404",
      description:
        eventData?.description ||
        "The page you are looking for does not exist or is no longer available",
      icon: eventData?.icon || "solar:forbidden-circle-bold",
      style: getStatusTheme("NOT_FOUND"),
      action: currentNotFoundAction
        ? () => {
            const NotFoundAction = currentNotFoundAction;
            return <NotFoundAction />;
          }
        : null,
      hideScroll: true,
    });
  });
}

function subscribeToGuardStatusEvents({
  clearStatus,
  setStatus,
  updateStatus,
}: {
  clearStatus: () => void;
  setStatus: React.Dispatch<React.SetStateAction<any>>;
  updateStatus: (status: any) => void;
}) {
  return globalEvents.subscribe(EVENT_TYPES.NAV_GUARD, (eventData: any) => {
    if (eventData?.clear) {
      setStatus((currentStatus: any) =>
        currentStatus?.type === "GUARD" ? null : currentStatus,
      );
      return;
    }
    updateStatus(createGuardStatus({ ...eventData, clearStatus }));
  });
}

function subscribeToConnectionStatusEvents({
  handleOffline,
  handleOnline,
}: {
  handleOffline: () => void;
  handleOnline: () => void;
}) {
  window.addEventListener("offline", handleOffline);
  window.addEventListener("online", handleOnline);
  if (typeof navigator !== "undefined" && !navigator.onLine) handleOffline();

  return () => {
    window.removeEventListener("offline", handleOffline);
    window.removeEventListener("online", handleOnline);
  };
}

function usePersistedAuthStatusRestoration({
  scheduleStatusClear,
  setStatus,
  skipPersistedStatusCleanupRef,
}: {
  scheduleStatusClear: (options?: any) => void;
  setStatus: React.Dispatch<React.SetStateAction<any>>;
  skipPersistedStatusCleanupRef: React.MutableRefObject<boolean>;
}) {
  useEffect(() => {
    const persistedStatus = restorePersistedAuthStatus();
    if (!persistedStatus) return;
    skipPersistedStatusCleanupRef.current = true;
    setStatus((currentStatus: any) => currentStatus || persistedStatus.status);
    scheduleStatusClear({
      duration: persistedStatus.remainingMs,
      clearWhen: [persistedStatus.status.type],
    });
  }, [scheduleStatusClear, setStatus, skipPersistedStatusCleanupRef]);
}

function usePersistedAuthStatusCleanup({
  skipPersistedStatusCleanupRef,
  status,
}: {
  skipPersistedStatusCleanupRef: React.MutableRefObject<boolean>;
  status: any;
}) {
  useEffect(() => {
    if (skipPersistedStatusCleanupRef.current) {
      skipPersistedStatusCleanupRef.current = false;
      return;
    }
    if (!isPersistableAuthStatus(status)) clearPersistedAuthStatus();
  }, [status, skipPersistedStatusCleanupRef]);
}

function useRouteErrorStatusCleanup({
  dispatchOfflineEvent,
  pathname,
  previousPathRef,
  setStatus,
}: {
  dispatchOfflineEvent: () => void;
  pathname: string | null;
  previousPathRef: React.MutableRefObject<string | null>;
  setStatus: React.Dispatch<React.SetStateAction<any>>;
}) {
  useEffect(() => {
    if (previousPathRef.current === pathname) return;
    previousPathRef.current = pathname;

    setStatus((currentStatus: any) => {
      if (
        currentStatus &&
        isErrorStatus(currentStatus.type) &&
        currentStatus.type !== "ACCOUNT_DELETE"
      ) {
        if (typeof navigator !== "undefined" && !navigator.onLine)
          dispatchOfflineEvent();
        return null;
      }
      return currentStatus;
    });
  }, [pathname, dispatchOfflineEvent, setStatus, previousPathRef]);
}

function useNavigationStatusTimerCleanup(clearAllTimers: () => void) {
  useEffect(() => () => clearAllTimers(), [clearAllTimers]);
}

export function useNavigationStatus(
  options: { notFoundAction?: ComponentType<any> | null } = {},
) {
  const pathname = usePathname();
  const notFoundAction = options?.notFoundAction || null;
  const notFoundActionRef = useRef(notFoundAction);
  useEffect(() => {
    notFoundActionRef.current = notFoundAction;
  }, [notFoundAction]);
  const [status, setStatus] = useState<any>(null);

  const previousPathRef = useRef(pathname);
  const apiErrorQueueRef = useRef<any[]>([]);
  const skipPersistedStatusCleanupRef = useRef(false);
  const batchTimerRef = useRef<any>(null);
  const statusClearTimerRef = useRef<any>(null);
  const onlineResetTimerRef = useRef<any>(null);
  const offlineDispatchTimerRef = useRef<any>(null);

  const clearTimer = useCallback((timerRef: React.MutableRefObject<any>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearTransientTimers = useCallback(() => {
    clearTimer(batchTimerRef);
    clearTimer(onlineResetTimerRef);
    clearTimer(offlineDispatchTimerRef);
  }, [clearTimer]);

  const clearAllTimers = useCallback(() => {
    clearTransientTimers();
    clearTimer(statusClearTimerRef);
  }, [clearTimer, clearTransientTimers]);

  const clearStatus = useCallback(() => {
    clearPersistedAuthStatus();
    setStatus(null);
  }, []);

  const updateStatus = useCallback((nextStatusOrFn: any) => {
    setStatus((currentStatus: any) => {
      const nextStatus =
        typeof nextStatusOrFn === "function"
          ? nextStatusOrFn(currentStatus)
          : nextStatusOrFn;
      if (!nextStatus) return null;
      if (isEquivalentAuthStatus(currentStatus, nextStatus))
        return currentStatus;
      if (!currentStatus) return nextStatus;
      return resolveStatusPriority(nextStatus) >=
        resolveStatusPriority(currentStatus)
        ? nextStatus
        : currentStatus;
    });
  }, []);

  const scheduleStatusClear = useCallback(
    ({
      duration = STATUS_CLEAR_DURATION,
      clearWhen = [],
    }: { duration?: number; clearWhen?: string[] } = {}) => {
      clearTimer(statusClearTimerRef);
      const clearTypes = Array.isArray(clearWhen)
        ? clearWhen.filter(Boolean)
        : [];

      statusClearTimerRef.current = setTimeout(() => {
        statusClearTimerRef.current = null;
        setStatus((currentStatus: any) => {
          if (!currentStatus) return currentStatus;
          if (
            clearTypes.length === 0 ||
            clearTypes.includes(currentStatus.type)
          ) {
            clearPersistedAuthStatus();
            return null;
          }
          return currentStatus;
        });
      }, duration);
    },
    [clearTimer],
  );

  const dispatchOfflineEvent = useCallback(() => {
    clearTimer(offlineDispatchTimerRef);
    offlineDispatchTimerRef.current = setTimeout(() => {
      offlineDispatchTimerRef.current = null;
      window.dispatchEvent(new Event("offline"));
    }, 0);
  }, [clearTimer]);

  const handleOffline = useCallback(() => {
    updateStatus(createConnectionStatus("OFFLINE"));
  }, [updateStatus]);

  const handleOnline = useCallback(() => {
    setStatus((currentStatus: any) => {
      if (currentStatus?.type !== "OFFLINE") return null;
      clearTimer(onlineResetTimerRef);
      onlineResetTimerRef.current = setTimeout(() => {
        onlineResetTimerRef.current = null;
        setStatus((nextStatus: any) =>
          nextStatus?.type === "ONLINE" ? null : nextStatus,
        );
      }, STATUS_CLEAR_DURATION);
      return createConnectionStatus("ONLINE");
    });
  }, [clearTimer]);

  usePersistedAuthStatusRestoration({
    scheduleStatusClear,
    setStatus,
    skipPersistedStatusCleanupRef,
  });
  usePersistedAuthStatusCleanup({ skipPersistedStatusCleanupRef, status });
  useRouteErrorStatusCleanup({
    dispatchOfflineEvent,
    pathname,
    previousPathRef,
    setStatus,
  });

  useEffect(() => {
    const unsubscribes = [
      subscribeToApiErrorStatusEvents({
        apiErrorQueueRef,
        batchTimerRef,
        clearStatus,
        clearTimer,
        updateStatus,
      }),
      subscribeToApplicationErrorStatusEvents({
        clearStatus,
        dispatchOfflineEvent,
        updateStatus,
      }),
      subscribeToSignOutStatusEvents({ scheduleStatusClear, updateStatus }),
      subscribeToAccountDeletionStatusEvents({
        clearTimer,
        statusClearTimerRef,
        setStatus,
        updateStatus,
      }),
      subscribeToSignInStatusEvents({ scheduleStatusClear, updateStatus }),
      subscribeToSignUpStatusEvents({ scheduleStatusClear, updateStatus }),
      subscribeToAuthFeedbackStatusEvents({
        clearTimer,
        scheduleStatusClear,
        setStatus,
        statusClearTimerRef,
        updateStatus,
      }),
      subscribeToNotFoundStatusEvents({
        notFoundActionRef,
        setStatus,
        updateStatus,
      }),
      subscribeToGuardStatusEvents({ clearStatus, setStatus, updateStatus }),
      subscribeToConnectionStatusEvents({ handleOffline, handleOnline }),
    ];
    return () => {
      unsubscribes.forEach((fn) => fn());
      clearTransientTimers();
    };
  }, [
    apiErrorQueueRef,
    batchTimerRef,
    clearStatus,
    clearTimer,
    clearTransientTimers,
    dispatchOfflineEvent,
    handleOffline,
    handleOnline,
    notFoundActionRef,
    scheduleStatusClear,
    updateStatus,
  ]);

  useNavigationStatusTimerCleanup(clearAllTimers);

  return status;
}

export function applyStatusOverlay(item: any, statusState: any) {
  if (!item || !statusState) return item;
  const showStatusActions =
    statusState.type === "APP_ERROR" ||
    statusState.type === "API_ERROR" ||
    statusState.type === "GUARD" ||
    Boolean(statusState.action);
  return {
    ...item,
    ...statusState,
    activeChild: null,
    children: null,
    hasActiveChild: false,
    isExpanded: false,
    isParent: false,
    isStatus: true,
    badge: null,
    iconOverlay: null,
    action: showStatusActions ? statusState.action : null,
    actions: showStatusActions ? statusState.actions : null,
  };
}
