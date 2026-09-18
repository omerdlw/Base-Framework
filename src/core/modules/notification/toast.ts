"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { normalizeFeedbackText } from "@/core/utils";
import { TOAST_DURATIONS, TOAST_TYPES } from "./constants";
import { useNotificationActions } from "./provider";
import type { ToastController, ToastOptions } from "./types";
import { shouldSuppressToast, withDefaultDuration } from "./utils";

export function useToast(): ToastController {
  const { showNotification } = useNotificationActions();

  const createToast = useCallback(
    (type: string, message: ReactNode, options: ToastOptions = {}) => {
      const safeOptions = options || {};
      const {
        action,
        actions,
        allowInProduction,
        dedupeKey,
        description,
        duration,
        id: explicitId,
        ...rest
      } = safeOptions;

      const normalizedMessage = normalizeFeedbackText(message);

      if (
        !normalizedMessage ||
        shouldSuppressToast(type, { allowInProduction })
      ) {
        return null;
      }

      const finalActions = actions || (action ? [action] : undefined);
      const resolvedId =
        dedupeKey || explicitId || String(normalizedMessage).slice(0, 50);

      showNotification(type, {
        ...rest,
        actions: finalActions,
        description: normalizeFeedbackText(description),
        duration,
        id: resolvedId,
        message: normalizedMessage,
      });
      return resolvedId;
    },
    [showNotification],
  );

  const success = useCallback(
    (message: ReactNode, options: ToastOptions = {}) =>
      createToast(
        TOAST_TYPES.SUCCESS,
        message,
        withDefaultDuration(TOAST_DURATIONS.SHORT, options),
      ),
    [createToast],
  );

  const warning = useCallback(
    (message: ReactNode, options: ToastOptions = {}) =>
      createToast(
        TOAST_TYPES.WARNING,
        message,
        withDefaultDuration(TOAST_DURATIONS.DEFAULT, options),
      ),
    [createToast],
  );

  const error = useCallback(
    (message: ReactNode, options: ToastOptions = {}) =>
      createToast(
        TOAST_TYPES.ERROR,
        message,
        withDefaultDuration(TOAST_DURATIONS.DEFAULT, options),
      ),
    [createToast],
  );

  const info = useCallback(
    (message: ReactNode, options: ToastOptions = {}) =>
      createToast(
        TOAST_TYPES.INFO,
        message,
        withDefaultDuration(TOAST_DURATIONS.SHORT, options),
      ),
    [createToast],
  );

  const show = useCallback(
    (type: string, message: ReactNode, options: ToastOptions = {}) =>
      createToast(type, message, options),
    [createToast],
  );

  return useMemo<ToastController>(
    () => ({
      error,
      info,
      show,
      success,
      warning,
    }),
    [success, warning, error, info, show],
  );
}
