"use client";

export {
  Container,
  Modal,
  ModalContainer,
  default as ModalDefault,
} from "./view";
export { default } from "./view";

export {
  INITIAL_MODAL_STATE,
  ModalActionsContext,
  ModalProvider,
  ModalStateContext,
  useModal,
  useModalActions,
  useModalState,
} from "./provider";

export { defineModal } from "./builder";

export {
  FALLBACK_MODAL_ACTIONS,
  FALLBACK_MODAL_ACTIONS as MODAL_DEFAULT_ACTIONS,
  FALLBACK_MODAL_STATE,
  FALLBACK_MODAL_STATE as MODAL_DEFAULT_STATE,
  FOCUSABLE_SELECTOR,
  HEIGHT_CONSTRAINT_PATTERN,
  MODAL_BREAKPOINTS,
  MODAL_CHROME,
  MODAL_POSITION_CLASSES,
  MODAL_POSITIONS,
  MODAL_STYLES,
  SMOOTH_SCROLL_LOCK_EVENT,
} from "./constants";

export {
  createModalState,
  dispatchSmoothScrollLock,
  finalizeModalClose,
  getFocusableElements,
  getModalLabel,
  getPanelBorderRadiusClass,
  getViewportIsMobile,
  hasHeightConstraint,
  hasSlotContent,
  isHeaderConfig,
  isSideModal,
  isSidePosition,
  isVerticalEdgePosition,
  normalizePositionConfig,
  resolveActivePosition,
  resolveHeaderActions,
  resolveModalHeader,
  trapFocus,
} from "./utils";

export {
  MODAL_BACKDROP_VARIANTS,
  MODAL_CONTENT_STAGGER,
  MODAL_CONTENT_VARIANTS,
  MODAL_EASINGS,
  MODAL_FOOTER_VARIANTS,
  MODAL_HEADER_VARIANTS,
  MODAL_LIST_ITEM_VARIANTS,
  MODAL_LIST_VARIANTS,
  MODAL_MICRO_SPRING,
  MODAL_MICRO_TAP,
  MODAL_MICRO_TAP_SCALE,
  MODAL_PANEL_SPRING,
  MODAL_POSITION_VARIANTS,
  getModalPositionVariants,
  getModalTransition,
  modalBackdropVariants,
} from "./motion";

export type * from "./types";
