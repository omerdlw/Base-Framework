"use client";

import { useModal } from "./provider";
import type {
  DefineModalOptions,
  ModalActions,
  ModalDefinition,
  ModalPosition,
  ResponsiveModalPosition,
} from "./types";

export function defineModal(
  definition: DefineModalOptions = {},
): ModalDefinition {
  const {
    chrome = null,
    component = null,
    defaultData = {},
    id = null,
    position = "center",
    title = null,
    type = null,
    ...extraConfig
  } = definition;

  const resolvedType =
    type ||
    id ||
    (component as any)?.displayName ||
    (component as any)?.name ||
    "modal";

  const modalDefinition: ModalDefinition = Object.freeze({
    chrome,
    component,
    config: {
      chrome,
      component,
      defaultData,
      id: id || resolvedType,
      position,
      title,
      type: resolvedType,
      ...extraConfig,
    },
    defaultData,
    id: id || resolvedType,
    isModalDefinition: true,
    open: (
      openModalFn: ModalActions["openModal"],
      data: Record<string, unknown> = {},
      overrides: Record<string, unknown> = {},
    ) => {
      const mergedData = { ...defaultData, ...data };
      const resolvedTitle =
        typeof title === "function" ? title(mergedData) : title;
      const targetPosition =
        (overrides.position as
          ModalPosition | ResponsiveModalPosition | undefined) || position;

      return openModalFn(modalDefinition, targetPosition, {
        chrome,
        component,
        data: mergedData,
        title: resolvedTitle,
        ...overrides,
      });
    },
    position,
    title,
    type: resolvedType,
    use: function useDefinedModal() {
      return useModal(modalDefinition);
    },
    ...extraConfig,
  });

  return modalDefinition;
}
