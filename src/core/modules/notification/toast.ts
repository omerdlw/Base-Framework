"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { isResult } from "@/core/result";
import { TOAST_DURATIONS } from "./constants";
import { useNotificationActions } from "./provider";
import type {
  ToastController,
  ToastOptions,
  ToastOptionsInput,
  ToastPromiseMessages,
} from "./types";
import { normalizeToastOptions, withDefaultDuration } from "./utils";

let toastPromiseIdCounter = 0;

export function useToast(defaultDuration?: number | null): ToastController {
  const { dismissAllNotifications, dismissNotification, showNotification } =
    useNotificationActions();

  const resolvedDefaultDuration =
    defaultDuration !== undefined && defaultDuration !== null
      ? defaultDuration
      : TOAST_DURATIONS.DEFAULT;

  const triggerToast = useCallback(
    (message: ReactNode, options?: ToastOptionsInput): string | null =>
      showNotification(
        message,
        withDefaultDuration(resolvedDefaultDuration, options),
      ),
    [resolvedDefaultDuration, showNotification],
  );

  const dismiss = useCallback(
    (id?: string) => {
      if (id) dismissNotification(id);
      else dismissAllNotifications();
    },
    [dismissAllNotifications, dismissNotification],
  );

  const dismissAll = useCallback(() => {
    dismissAllNotifications();
  }, [dismissAllNotifications]);

  const fromResult = useCallback(
    <T = any, E = any>(
      result: any,
      messages: ToastPromiseMessages<T, E> = {},
      options?: ToastOptionsInput,
    ) => {
      if (isResult(result)) {
        if (result.success) {
          const msg =
            typeof messages.success === "function"
              ? messages.success(result.data as T)
              : messages.success;
          if (msg) triggerToast(msg, options);
        } else {
          const errPayload = result.error as any;
          const fallbackErr =
            typeof errPayload === "string"
              ? errPayload
              : errPayload?.message || "Operation failed";
          const msg =
            typeof messages.error === "function"
              ? messages.error(errPayload as E)
              : messages.error || fallbackErr;
          if (msg) triggerToast(msg, options);
        }
      }
      return result;
    },
    [triggerToast],
  );

  const promise = useCallback(
    async <T = any, E = any>(
      promiseOrFn: Promise<T> | (() => Promise<T>),
      messages: ToastPromiseMessages<T, E> = {},
      options?: ToastOptionsInput,
    ): Promise<T> => {
      const normalizedOpts = normalizeToastOptions(options);
      const id =
        normalizedOpts.id ||
        normalizedOpts.dedupeKey ||
        `toast-promise-${++toastPromiseIdCounter}`;
      const sharedOptions: ToastOptions = {
        ...normalizedOpts,
        id,
      };

      if (messages.loading) {
        showNotification(messages.loading, {
          ...sharedOptions,
          duration: null,
        });
      }

      try {
        const task =
          typeof promiseOrFn === "function" ? promiseOrFn() : promiseOrFn;
        const resolved = await task;

        if (isResult(resolved)) {
          fromResult(resolved, messages, sharedOptions);
          if (!resolved.success && !messages.error && messages.loading) {
            dismiss(id);
          } else if (resolved.success && !messages.success && messages.loading) {
            dismiss(id);
          }
          return resolved;
        }

        const successMsg =
          typeof messages.success === "function"
            ? messages.success(resolved)
            : messages.success;
        if (successMsg) {
          triggerToast(successMsg, sharedOptions);
        } else if (messages.loading) {
          dismiss(id);
        }

        return resolved;
      } catch (err: any) {
        const fallbackErr =
          typeof err === "string" ? err : err?.message || "Operation failed";
        const errorMsg =
          typeof messages.error === "function"
            ? messages.error(err)
            : messages.error || fallbackErr;
        if (errorMsg) {
          triggerToast(errorMsg, sharedOptions);
        } else if (messages.loading) {
          dismiss(id);
        }
        throw err;
      }
    },
    [dismiss, fromResult, showNotification, triggerToast],
  );

  return useMemo<ToastController>(
    () =>
      Object.assign(
        (message: ReactNode, options?: ToastOptionsInput) =>
          triggerToast(message, options),
        {
          dismiss,
          dismissAll,
          fromResult,
          promise,
        },
      ),
    [dismiss, dismissAll, fromResult, promise, triggerToast],
  );
}
