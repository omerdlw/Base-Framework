"use client";

import {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { useRequiredContext } from "@/core/hooks";
import {
  MODAL_CHROME,
  MODAL_POSITIONS,
} from "./constants";
import type {
  ModalActions,
  ModalDefinition,
  ModalEntry,
  ModalHookBinding,
  ModalHookControls,
  ModalOpenFn,
  ModalPosition,
  ModalProviderProps,
  ModalState,
  ResponsiveModalPosition,
} from "./types";
import {
  createModalState,
  finalizeModalClose,
  normalizePositionConfig,
  resolveModalHeader,
  resolveModalOpenInput,
} from "./utils";

export const INITIAL_MODAL_STATE = createModalState([]);

export interface ModalContextValue {
  actions: ModalActions;
  state: ModalState;
}

export const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({
  children,
  modalRenderer: ModalRenderer = null,
}: ModalProviderProps) {
  const [modalState, setModalState] = useState<ModalState>(INITIAL_MODAL_STATE);

  const modalStackRef = useRef<ModalEntry[]>([]);
  const resolveMapRef = useRef<Map<number, (result?: unknown) => void>>(
    new Map(),
  );
  const onCloseMapRef = useRef<
    Map<number, ((result?: unknown) => unknown) | null>
  >(new Map());
  const modalIdRef = useRef<number>(0);

  const syncModalStack = useCallback((nextStack: ModalEntry[]) => {
    modalStackRef.current = nextStack;
    setModalState(createModalState(nextStack));
  }, []);

  const openModal = useCallback<ModalActions["openModal"]>(
    (modalInput, positionInput = MODAL_POSITIONS.CENTER, config = {}) => {
      const currentStack = modalStackRef.current;
      if (!modalInput) return Promise.resolve(null);

      const {
        effectiveConfig,
        effectivePositionInput,
        resolvedComponent,
        resolvedType,
      } = resolveModalOpenInput(modalInput, positionInput, config);

      const topEntry = currentStack[currentStack.length - 1];
      if (
        topEntry &&
        (topEntry.modalType === resolvedType ||
          (resolvedComponent && topEntry.component === resolvedComponent))
      ) {
        return Promise.resolve(null);
      }

      const { position, responsivePosition } = normalizePositionConfig(
        effectivePositionInput as ModalPosition | ResponsiveModalPosition,
        effectiveConfig,
      );
      const resolvedHeader = resolveModalHeader(effectiveConfig);
      const modalId = ++modalIdRef.current;

      const modalEntry: ModalEntry = {
        chrome: effectiveConfig.chrome || MODAL_CHROME.PANEL,
        component: resolvedComponent,
        headerActions: resolvedHeader.actions || null,
        id: modalId,
        modalType: resolvedType,
        position,
        props: (effectiveConfig.data ?? effectiveConfig) as Record<
          string,
          unknown
        >,
        responsivePosition,
        showClose: resolvedHeader.showClose ?? true,
        title: resolvedHeader.title,
      };

      const modalPromise = new Promise((resolve) => {
        resolveMapRef.current.set(modalId, resolve);
        onCloseMapRef.current.set(modalId, effectiveConfig.onClose || null);
      });

      syncModalStack([...currentStack, modalEntry]);
      return modalPromise;
    },
    [syncModalStack],
  );

  const closeModal = useCallback<ModalActions["closeModal"]>(
    (result = null, targetModalId = null) => {
      const currentStack = modalStackRef.current;
      if (currentStack.length === 0) return;

      const modalId =
        targetModalId || currentStack[currentStack.length - 1]?.id || null;
      if (!modalId) return;

      const isTargetInStack = currentStack.some(
        (entry) => entry.id === modalId,
      );

      if (!isTargetInStack) return;

      syncModalStack(currentStack.filter((entry) => entry.id !== modalId));
      finalizeModalClose(modalId, result, {
        logCloseErrors: true,
        onCloseMapRef,
        resolveMapRef,
      });
    },
    [syncModalStack],
  );

  const closeAllModals = useCallback<ModalActions["closeAllModals"]>(
    (result = null) => {
      const currentStack = modalStackRef.current;
      if (currentStack.length === 0) return;

      syncModalStack([]);
      currentStack.forEach((entry) => {
        finalizeModalClose(entry.id, result, { onCloseMapRef, resolveMapRef });
      });
    },
    [syncModalStack],
  );

  const actionsValue = useMemo<ModalActions>(
    () => ({
      closeAllModals,
      closeModal,
      openModal,
    }),
    [openModal, closeModal, closeAllModals],
  );

  const contextValue = useMemo<ModalContextValue>(
    () => ({ actions: actionsValue, state: modalState }),
    [actionsValue, modalState],
  );

  return (
    <ModalContext value={contextValue}>
      {ModalRenderer && <ModalRenderer />}
      {children}
    </ModalContext>
  );
}

export function useModalActions(): ModalActions {
  return useRequiredContext(ModalContext, "useModalActions", "ModalProvider")
    .actions;
}

export function useModalState(): ModalState {
  return useRequiredContext(ModalContext, "useModalState", "ModalProvider")
    .state;
}

export function useModal(): ModalState & ModalActions;
export function useModal(
  modalDefinition: ModalDefinition | ComponentType<any> | string,
): ModalHookBinding;
export function useModal(
  modalDefinition?: ModalDefinition | ComponentType<any> | string | null,
): (ModalState & ModalActions) | ModalHookBinding {
  const actions = useModalActions();
  const state = useModalState();

  const specificModal = useMemo<ModalHookBinding | null>(() => {
    if (!modalDefinition) return null;

    const isDefObject =
      typeof modalDefinition === "object" && modalDefinition !== null;
    const def = isDefObject ? (modalDefinition as ModalDefinition) : null;

    const targetType =
      typeof modalDefinition === "string"
        ? modalDefinition
        : def?.type ||
          def?.id ||
          (def?.component as any)?.displayName ||
          (def?.component as any)?.name ||
          null;

    const targetComponent =
      typeof modalDefinition === "function"
        ? modalDefinition
        : def?.component || null;

    const isThisModalOpen = state.modalStack.some(
      (entry) =>
        (targetType && entry.modalType === targetType) ||
        (targetComponent && entry.component === targetComponent),
    );

    const open: ModalOpenFn = (data, overrides) =>
      actions.openModal(modalDefinition, data, overrides);

    const controls: ModalHookControls = {
      close: actions.closeModal,
      closeAll: actions.closeAllModals,
      isOpen: isThisModalOpen,
      state,
    };

    const binding = [open, controls] as unknown as ModalHookBinding;
    binding.open = open;
    binding.close = actions.closeModal;
    binding.closeAll = actions.closeAllModals;
    binding.isOpen = isThisModalOpen;
    binding.state = state;
    return binding;
  }, [actions, modalDefinition, state]);

  const generalModal = useMemo(
    () => ({
      ...actions,
      ...state,
    }),
    [actions, state],
  );

  return (modalDefinition && specificModal ? specificModal : generalModal) as
    (ModalState & ModalActions) | ModalHookBinding;
}
