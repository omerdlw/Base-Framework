import type { ReactNode } from "react";

export interface NotificationData {
  dedupeKey?: string;
  duration?: number | null;
  id?: string;
  message: ReactNode;
  timestamp?: number;
}

export interface NotificationEntry extends NotificationData {
  id: string;
  message: ReactNode;
  timestamp: number;
}

export interface NotificationState {
  notifications: Record<string, NotificationEntry>;
}

export interface NotificationOptions {
  dedupeKey?: string;
  duration?: number | null;
  id?: string;
}

export type ToastOptions = NotificationOptions;
export type ToastOptionsInput = number | NotificationOptions;

export interface NotificationActions {
  dismissAllNotifications: () => void;
  dismissNotification: (id: string) => void;
  showNotification: (
    messageOrData: ReactNode | NotificationData,
    options?: ToastOptionsInput,
  ) => string | null;
}

export interface NotificationProviderProps {
  children?: ReactNode;
}

export interface ToastPromiseMessages<T = any, E = any> {
  error?: ReactNode | ((error: E) => ReactNode);
  loading?: ReactNode;
  success?: ReactNode | ((data: T) => ReactNode);
}

export interface ToastController {
  (message: ReactNode, options?: ToastOptionsInput): string | null;
  dismiss: (id?: string) => void;
  dismissAll: () => void;
  fromResult: <T = any, E = any>(
    result: any,
    messages?: ToastPromiseMessages<T, E>,
    options?: ToastOptionsInput,
  ) => any;
  promise: <T = any, E = any>(
    promiseOrFn: Promise<T> | (() => Promise<T>),
    messages?: ToastPromiseMessages<T, E>,
    options?: ToastOptionsInput,
  ) => Promise<T>;
}
