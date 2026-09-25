"use client";

import {
  createElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Z_INDEX } from "@/core/tokens";
import { cn } from "@/core/utils";
import { Button, Icon } from "@/core/primitives";
import { useModalRegistry, usePageRuntimeBridge } from "@/core/orchestration";

import {
  MODAL_BREAKPOINTS,
  MODAL_CHROME,
  MODAL_POSITION_CLASSES,
  MODAL_POSITIONS,
  MODAL_STYLES as STYLES,
} from "./constants";
import {
  MODAL_COMPOSITOR_STYLE,
  MODAL_CONTENT_VARIANTS,
  MODAL_FOOTER_VARIANTS,
  MODAL_HEADER_VARIANTS,
  getModalPositionVariants,
  getModalTransition,
  modalBackdropVariants,
} from "./motion";
import type {
  ModalContainerFooterConfig,
  ModalContainerHeaderConfig,
  ModalContainerProps,
  ModalEntry,
} from "./types";
import {
  dispatchSmoothScrollLock,
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
  resolveActivePosition,
  resolveHeaderActions,
  trapFocus,
} from "./utils";
import { ModalProvider as ModalRuntimeProvider, useModal } from "./provider";

const emptySubscribe = () => () => {};

function ModalEntryErrorBoundary({
  children,
  name,
}: {
  children: ReactNode;
  name?: string;
}) {
  const { ModuleError } = usePageRuntimeBridge();
  return <ModuleError name={name}>{children}</ModuleError>;
}

function CloseButton({
  close,
  label = "Close modal",
}: {
  close?: (result?: unknown) => void;
  label?: string;
}) {
  if (typeof close !== "function") return null;
  return (
    <Button
      type="button"
      aria-label={label}
      onClick={close}
      className={STYLES.CLOSE_BTN}
    >
      <Icon icon="solar:close-bold" size={16} />
    </Button>
  );
}

export function Container({
  bodyClassName,
  children,
  className,
  close,
  footer,
  header = {},
  position = null,
}: ModalContainerProps) {
  const isHeaderDisabled = header === false;
  const headerConfig =
    !isHeaderDisabled && isHeaderConfig(header)
      ? (header as ModalContainerHeaderConfig)
      : {};
  const hasCustomHeaderNode =
    !isHeaderDisabled && !isHeaderConfig(header) && hasSlotContent(header);

  const resolvedPosition = position || headerConfig?.position || null;
  const showClose = headerConfig?.showClose === true;
  const headerActions = resolveHeaderActions(headerConfig?.actions, close);

  const headerLeft = hasCustomHeaderNode
    ? null
    : (headerConfig?.left ??
      (headerConfig?.title ? (
        <h2
          id={headerConfig.titleId}
          className="truncate text-sm font-semibold text-white"
        >
          {headerConfig.title}
        </h2>
      ) : null));
  const headerCenter = hasCustomHeaderNode
    ? (header as ReactNode)
    : (headerConfig?.center ?? null);
  const headerRight = hasCustomHeaderNode
    ? null
    : (headerConfig?.right ??
      (hasSlotContent(headerActions) || showClose ? (
        <div className="flex items-center justify-end gap-2.5">
          {headerActions}
          {showClose && <CloseButton close={close} />}
        </div>
      ) : null));

  const shouldRenderHeader =
    !isHeaderDisabled &&
    (hasSlotContent(headerLeft) ||
      hasSlotContent(headerCenter) ||
      hasSlotContent(headerRight));

  const footerConfig =
    footer && typeof footer === "object"
      ? (footer as ModalContainerFooterConfig)
      : {};
  const footerLeft = footerConfig.left ?? null;
  const footerCenter = footerConfig.center ?? null;
  const footerRight = footerConfig.right ?? null;
  const shouldRenderFooter =
    footer !== false &&
    (hasSlotContent(footerLeft) ||
      hasSlotContent(footerCenter) ||
      hasSlotContent(footerRight));

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden",
        isSideModal(resolvedPosition)
          ? "h-full max-h-full"
          : hasHeightConstraint(className)
            ? null
            : "max-h-[70dvh]",
        className,
      )}
    >
      {shouldRenderHeader && (
        <motion.div
          variants={MODAL_HEADER_VARIANTS}
          initial="hidden"
          animate="visible"
          className={cn(
            hasSlotContent(headerCenter)
              ? "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
              : "flex justify-between",
            STYLES.HEADER_LAYOUT,
            headerConfig?.sticky && "sticky top-0 z-10 bg-black/80 backdrop-blur-md",
          )}
        >
          <div className="min-w-0">{headerLeft}</div>
          {hasSlotContent(headerCenter) && (
            <div className="flex items-center justify-center">
              {headerCenter}
            </div>
          )}
          <div className="min-w-0">{headerRight}</div>
        </motion.div>
      )}

      <motion.div
        variants={MODAL_CONTENT_VARIANTS}
        initial="hidden"
        animate="visible"
        data-lenis-prevent
        data-lenis-prevent-wheel
        className={cn(
          "modal-body min-h-0 w-full flex-1 overflow-y-auto overscroll-contain rounded-[20px]",
          bodyClassName,
        )}
      >
        {children}
      </motion.div>

      {shouldRenderFooter && (
        <motion.div
          variants={MODAL_FOOTER_VARIANTS}
          initial="hidden"
          animate="visible"
          className={cn(
            hasSlotContent(footerCenter)
              ? "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
              : "flex justify-between",
            STYLES.HEADER_LAYOUT,
            footerConfig.sticky && "sticky bottom-0 bg-black/80 backdrop-blur-md",
          )}
        >
          <div className="min-w-0">{footerLeft}</div>
          {hasSlotContent(footerCenter) && (
            <div className="flex items-center justify-center">
              {footerCenter}
            </div>
          )}
          <div
            className={cn(
              "flex items-center gap-2.5",
              hasSlotContent(footerCenter) ? "w-full justify-end" : null,
            )}
          >
            {footerRight}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export const ModalContainer = Container;

function ModalLayerSwitcher({
  currentEntry,
  onSwitchToPrevious,
  previousEntry,
}: {
  currentEntry: ModalEntry;
  onSwitchToPrevious: () => void;
  previousEntry: ModalEntry;
}) {
  return (
    <div className={STYLES.LAYER_SWITCHER}>
      <Button
        type="button"
        onClick={onSwitchToPrevious}
        className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white/70 uppercase ring-1 ring-white/5 ring-inset hover:bg-white hover:text-black"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className="shrink-0"
        >
          <path
            d="M7.5 2.5L4 6l3.5 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {getModalLabel(previousEntry.modalType)}
      </Button>
      <span className="text-xs text-white/15">/</span>
      <span className="rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-bold uppercase ring-1 ring-white/10 ring-inset">
        {getModalLabel(currentEntry.modalType)}
      </span>
    </div>
  );
}

function ModalLayer({
  closeModal,
  entry,
  isMobileViewport,
  isTopModal,
  modalStack,
  registry,
  stackIndex,
}: {
  closeModal: (result?: unknown, targetModalId?: number | null) => void;
  entry: ModalEntry;
  isMobileViewport: boolean;
  isTopModal: boolean;
  modalStack: ModalEntry[];
  registry: { get: (key: string) => any };
  stackIndex: number;
}) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const activePosition = useMemo(
    () =>
      resolveActivePosition(
        entry.position,
        entry.responsivePosition,
        isMobileViewport,
      ),
    [entry.position, entry.responsivePosition, isMobileViewport],
  );

  const ActiveModalComponent = entry.component || registry.get(entry.modalType);
  const isPanelChrome = entry.chrome !== MODAL_CHROME.BARE;
  const isLeftModal = activePosition === MODAL_POSITIONS.LEFT;
  const isSide = isSidePosition(activePosition);
  const isVerticalEdge = isVerticalEdgePosition(activePosition);

  const previousEntry = modalStack[stackIndex - 1] || null;
  const baseZIndex = Z_INDEX.MODAL + stackIndex * 2;

  useEffect(() => {
    if (!isTopModal || !modalRef.current) return;
    const previouslyFocusedElement =
      document.activeElement as HTMLElement | null;
    const initialElements = getFocusableElements(modalRef.current);
    if (initialElements.length > 0) initialElements[0].focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal(null, entry.id);
      else trapFocus(event, modalRef.current);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocusedElement?.isConnected)
        previouslyFocusedElement.focus();
    };
  }, [closeModal, entry.id, isTopModal]);

  if (!ActiveModalComponent) return null;

  return (
    <div
      role="dialog"
      aria-modal={isTopModal}
      aria-labelledby={entry.title ? `modal-title-${entry.id}` : undefined}
      style={{ zIndex: baseZIndex }}
      className={cn(
        "pointer-events-none fixed inset-0 flex flex-col",
        (MODAL_POSITION_CLASSES as Record<string, string>)[activePosition] ||
          MODAL_POSITION_CLASSES[MODAL_POSITIONS.CENTER],
        activePosition === MODAL_POSITIONS.CENTER &&
          !isMobileViewport &&
          "px-3",
      )}
    >
      <motion.div
        ref={modalRef}
        variants={getModalPositionVariants(activePosition)}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={getModalTransition(activePosition)}
        className={cn(
          "relative flex max-w-full flex-col",
          isTopModal
            ? "pointer-events-auto"
            : "pointer-events-none select-none",
          activePosition === MODAL_POSITIONS.CENTER && "w-full sm:w-auto",
          isVerticalEdge && "w-full self-stretch",
          isSide && (isMobileViewport ? "w-full self-stretch" : "w-auto"),
        )}
        style={{ zIndex: baseZIndex + 1, ...MODAL_COMPOSITOR_STYLE }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            STYLES.PANEL_BASE,
            isPanelChrome ? STYLES.PANEL_CHROME : STYLES.PANEL_BARE,
            isPanelChrome &&
              getPanelBorderRadiusClass(activePosition, isMobileViewport),
            isPanelChrome &&
              activePosition === MODAL_POSITIONS.TOP &&
              "border-t-0",
            isPanelChrome &&
              activePosition === MODAL_POSITIONS.BOTTOM &&
              "border-b-0",
            isPanelChrome &&
              isVerticalEdge &&
              isMobileViewport &&
              (activePosition === MODAL_POSITIONS.TOP
                ? "w-full rounded-b-[30px] border-t-0 border-x-0"
                : "w-full rounded-t-[30px] border-b-0 border-x-0"),
            isPanelChrome &&
              isSide && [
                isMobileViewport
                  ? "h-screen max-h-screen w-full self-stretch rounded-none border-0"
                  : "h-screen max-h-screen w-full",
                !isMobileViewport &&
                  (isLeftModal ? "border-l-0" : "border-r-0"),
              ],
          )}
        >
          <ModalEntryErrorBoundary name={entry.modalType}>
            {createElement(ActiveModalComponent, {
              close: (result: unknown) => closeModal(result, entry.id),
              data: entry.props,
              header: {
                actions: entry.headerActions,
                position: activePosition,
                showClose: entry.showClose,
                title: entry.title,
                titleId: `modal-title-${entry.id}`,
              },
            })}
          </ModalEntryErrorBoundary>

          {!isTopModal && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                const topModal = modalStack[modalStack.length - 1];
                if (topModal) closeModal(null, topModal.id);
              }}
              className="pointer-events-auto absolute inset-0 z-50 cursor-pointer bg-black/30 backdrop-blur-[2px] transition-all duration-300 ease-in-out"
              aria-label="Close active top modal"
            />
          )}

          {isTopModal && stackIndex > 0 && previousEntry && (
            <ModalLayerSwitcher
              currentEntry={entry}
              previousEntry={previousEntry}
              onSwitchToPrevious={() => closeModal(null, entry.id)}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}

export function Modal() {
  const { modalStack = [], isOpen, closeModal } = useModal();
  const registry = useModalRegistry();

  const visibleModalStack = useMemo(
    () =>
      modalStack.filter((entry: ModalEntry) =>
        Boolean(entry.component || registry.get(entry.modalType)),
      ),
    [modalStack, registry],
  );
  const topModalEntry = visibleModalStack[visibleModalStack.length - 1] || null;
  const isModalVisible = Boolean(isOpen && topModalEntry);

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [isMobileViewport, setIsMobileViewport] = useState(getViewportIsMobile);
  const [isTopExitSettling, setIsTopExitSettling] = useState(false);

  const previousTopModalIdRef = useRef<number | null>(null);
  const bodyOverflowRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const currentTopModalId = topModalEntry?.id || null;
    const previousTopModalId = previousTopModalIdRef.current;
    const previousTopStillMounted = visibleModalStack.some(
      (entry: ModalEntry) => entry.id === previousTopModalId,
    );

    if (
      previousTopModalId &&
      previousTopModalId !== currentTopModalId &&
      !previousTopStillMounted
    ) {
      setIsTopExitSettling(true);
    }
    previousTopModalIdRef.current = currentTopModalId;
  }, [topModalEntry?.id, visibleModalStack]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia(
      `(max-width: ${MODAL_BREAKPOINTS.MOBILE_MAX_WIDTH}px)`,
    );
    const handleViewportChange = (e: MediaQueryListEvent) =>
      setIsMobileViewport(e.matches);

    mediaQuery.addEventListener("change", handleViewportChange);
    return () => mediaQuery.removeEventListener("change", handleViewportChange);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    if (isModalVisible) {
      if (bodyOverflowRef.current === null)
        bodyOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else if (bodyOverflowRef.current !== null) {
      document.body.style.overflow = bodyOverflowRef.current;
      bodyOverflowRef.current = null;
    }
    dispatchSmoothScrollLock(isModalVisible);
  }, [isModalVisible]);

  useEffect(() => {
    return () => {
      if (typeof document !== "undefined" && bodyOverflowRef.current !== null) {
        document.body.style.overflow = bodyOverflowRef.current;
        bodyOverflowRef.current = null;
      }
      dispatchSmoothScrollLock(false);
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      <AnimatePresence>
        {isModalVisible && (
          <motion.div
            key="global-modal-backdrop"
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 cursor-pointer bg-black/60 backdrop-blur-md"
            style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
            onClick={() => {
              if (!isTopExitSettling) closeModal(null, topModalEntry.id);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence onExitComplete={() => setIsTopExitSettling(false)}>
        {visibleModalStack.map((entry: ModalEntry, index: number) => (
          <ModalLayer
            key={entry.id}
            entry={entry}
            stackIndex={index}
            isTopModal={
              index === visibleModalStack.length - 1 && !isTopExitSettling
            }
            isMobileViewport={isMobileViewport}
            closeModal={closeModal}
            registry={registry}
            modalStack={visibleModalStack}
          />
        ))}
      </AnimatePresence>
    </>,
    document.body,
  );
}

export default Modal;

export function ModalViewProvider({ children }: { children?: ReactNode }) {
  return (
    <ModalRuntimeProvider modalRenderer={Modal}>
      {children}
    </ModalRuntimeProvider>
  );
}
