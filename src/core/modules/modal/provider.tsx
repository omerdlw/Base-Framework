"use client";

import {
  createContext,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import {
  FALLBACK_MODAL_ACTIONS,
  FALLBACK_MODAL_STATE,
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
} from "./utils";

export const INITIAL_MODAL_STATE = createModalState([]);
export const ModalActionsContext = createContext<ModalActions>(
  FALLBACK_MODAL_ACTIONS,
);
export const ModalStateContext =
  createContext<ModalState>(FALLBACK_MODAL_STATE);

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

      const isDefinition =
        typeof modalInput === "object" &&
        modalInput !== null &&
        Boolean(
          ("component" in modalInput && modalInput.component) ||
          ("type" in modalInput && modalInput.type) ||
          ("isModalDefinition" in modalInput && modalInput.isModalDefinition),
        );
      const def = isDefinition ? (modalInput as ModalDefinition) : null;
      const isDirectComponent = typeof modalInput === "function";

      const resolvedComponent = def
        ? def.component || null
        : isDirectComponent
          ? (modalInput as ComponentType<any>)
          : null;

      const resolvedType =
        typeof modalInput === "string"
          ? modalInput
          : def?.type ||
            def?.id ||
            (resolvedComponent as any)?.displayName ||
            (resolvedComponent as any)?.name ||
            "modal";

      const isPositionObject =
        typeof positionInput === "object" &&
        positionInput !== null &&
        ("mobile" in positionInput || "desktop" in positionInput);
      const isPositionString = typeof positionInput === "string";
      const isSecondArgData =
        !isPositionString &&
        !isPositionObject &&
        typeof positionInput === "object" &&
        positionInput !== null;

      const rawData = isSecondArgData ? positionInput : (config.data ?? config);
      const rawOverrides = isSecondArgData ? config : {};

      const defaultData = def?.defaultData || {};
      const mergedData: Record<string, unknown> =
        typeof rawData === "object" && rawData !== null
          ? { ...defaultData, ...(rawData as Record<string, unknown>) }
          : defaultData;

      const resolvedTitle =
        def && typeof def.title === "function"
          ? def.title(mergedData)
          : rawOverrides.title || config.title || def?.title || null;

      const effectivePositionInput = isSecondArgData
        ? def?.position || MODAL_POSITIONS.CENTER
        : positionInput || def?.position || MODAL_POSITIONS.CENTER;

      const effectiveConfig: Record<string, any> = {
        ...(def || {}),
        ...config,
        ...rawOverrides,
        data: mergedData,
        title: resolvedTitle,
      };

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

  return (
    <ModalActionsContext value={actionsValue}>
      <ModalStateContext value={modalState}>
        {ModalRenderer && <ModalRenderer />}
        {children}
      </ModalStateContext>
    </ModalActionsContext>
  );
}

export function useModalActions(): ModalActions {
  return use(ModalActionsContext);
}

export function useModalState(): ModalState {
  return use(ModalStateContext);
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
