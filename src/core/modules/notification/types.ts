import type { ReactNode } from "react";

export type CriticalType =
  "PERMISSION_DENIED" | "SESSION_EXPIRED" | "SERVER_ERROR" | "OFFLINE";

export type ToastType = "WARNING" | "SUCCESS" | "ERROR" | "INFO";

export type NotificationType = CriticalType | ToastType | string;

export interface NotificationActionItem {
  className?: string;
  dismiss?: boolean;
  label: string;
  onClick?: () => void;
}

export interface NotificationPresetConfig {
  actionToneClass: string;
  description?: string;
  dismissible: boolean;
  icon: string;
  theme: {
    description?: string;
    icon?: string;
    surface?: string;
    title?: string;
  };
  title: string;
  tone: string;
}

export interface NotificationData {
  action?: NotificationActionItem;
  actions?: NotificationActionItem[];
  allowInProduction?: boolean;
  colorClass?: Record<string, string> | string;
  dedupeKey?: string;
  description?: ReactNode;
  dismissible?: boolean;
  duration?: number | null;
  icon?: ReactNode;
  id?: string;
  message?: ReactNode;
  timestamp?: number;
  title?: ReactNode;
  tone?: string;
  type?: NotificationType;
  [key: string]: unknown;
}

export interface NotificationEntry extends NotificationData {
  id: string;
  timestamp: number;
  type: NotificationType;
}

export interface NotificationState {
  notifications: Record<string, NotificationEntry>;
}

export interface NotificationActions {
  dismissNotification: (id: string) => void;
  showNotification: (type: NotificationType, data?: NotificationData) => void;
}

export interface NotificationProviderProps {
  children?: ReactNode;
}

export interface ToastOptions {
  action?: NotificationActionItem;
  actions?: NotificationActionItem[];
  allowInProduction?: boolean;
  dedupeKey?: string;
  description?: ReactNode;
  duration?: number;
  id?: string;
  [key: string]: unknown;
}

export interface ToastController {
  error: (message: ReactNode, options?: ToastOptions) => string | null | void;
  info: (message: ReactNode, options?: ToastOptions) => string | null | void;
  show: (
    type: NotificationType,
    message: ReactNode,
    options?: ToastOptions,
  ) => string | null | void;
  success: (message: ReactNode, options?: ToastOptions) => string | null | void;
  warning: (message: ReactNode, options?: ToastOptions) => string | null | void;
}
