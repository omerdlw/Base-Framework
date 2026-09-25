import type { ComponentType, ReactNode } from "react";

export type ModalPosition = "center" | "bottom" | "right" | "left" | "top";

export interface ResponsiveModalPosition {
  desktop?: ModalPosition;
  mobile?: ModalPosition;
}

export type ModalChrome = "panel" | "bare";

export interface ModalEntry {
  activeModalId?: number | string | null;
  chrome?: ModalChrome;
  component?: ComponentType<any> | null;
  headerActions?: ReactNode | null;
  id: number;
  modalType: string;
  position: ModalPosition;
  props?: Record<string, unknown>;
  responsivePosition?: ResponsiveModalPosition | null;
  showClose?: boolean;
  title?: ReactNode | null;
}

export interface ModalState {
  activeModalId: number | string | null;
  chrome: ModalChrome;
  headerActions: ReactNode | null;
  isOpen: boolean;
  modalStack: ModalEntry[];
  modalType: string | null;
  position: ModalPosition;
  props: Record<string, unknown>;
  responsivePosition: ResponsiveModalPosition | null;
  showClose: boolean;
  title: ReactNode | null;
}

export type ModalInput = ModalDefinition | ComponentType<any> | string;

export interface ModalActions {
  closeAllModals: (result?: unknown) => void;
  closeModal: (result?: unknown, targetModalId?: number | null) => void;
  openModal: (
    modalInput: ModalInput,
    positionInput?:
      ModalPosition | ResponsiveModalPosition | Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<unknown>;
}

export interface ModalHookControls {
  close: (result?: unknown) => void;
  closeAll: (result?: unknown) => void;
  isOpen: boolean;
  state: ModalState;
}

export type ModalOpenFn = (
  data?: Record<string, unknown>,
  overrides?: Record<string, unknown>,
) => Promise<unknown>;

export type ModalHookBinding = [ModalOpenFn, ModalHookControls] &
  ModalHookControls & {
    open: ModalOpenFn;
  };

export interface ModalDefinition {
  chrome?: ModalChrome | null;
  component?: ComponentType<any> | null;
  defaultData?: Record<string, unknown>;
  id?: string | null;
  isModalDefinition?: boolean;
  open: (
    openModalFn: ModalActions["openModal"],
    data?: Record<string, unknown>,
    overrides?: Record<string, unknown>,
  ) => Promise<unknown>;
  position?: ModalPosition | ResponsiveModalPosition;
  title?: ReactNode | ((data: Record<string, unknown>) => ReactNode) | null;
  type?: string | null;
  use: () => ModalHookBinding;
  [key: string]: unknown;
}

export interface DefineModalOptions {
  chrome?: ModalChrome | null;
  component?: ComponentType<any> | null;
  defaultData?: Record<string, unknown>;
  id?: string | null;
  position?: ModalPosition | ResponsiveModalPosition;
  title?: ReactNode | ((data: Record<string, unknown>) => ReactNode) | null;
  type?: string | null;
  [key: string]: unknown;
}

export interface ModalProviderProps {
  children?: ReactNode;
  modalRenderer?: ComponentType | null;
}

export interface ModalContainerHeaderConfig {
  actions?:
    ReactNode | ((props: { close?: (result?: unknown) => void }) => ReactNode);
  center?: ReactNode;
  left?: ReactNode;
  position?: ModalPosition;
  right?: ReactNode;
  showClose?: boolean;
  sticky?: boolean;
  title?: ReactNode;
  titleId?: string;
}

export interface ModalContainerFooterConfig {
  center?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  sticky?: boolean;
}

export interface ModalContainerProps {
  bodyClassName?: string;
  children?: ReactNode;
  className?: string;
  close?: (result?: unknown) => void;
  footer?: ModalContainerFooterConfig | ReactNode | boolean;
  header?: ModalContainerHeaderConfig | ReactNode | boolean;
  position?: ModalPosition | null;
}
