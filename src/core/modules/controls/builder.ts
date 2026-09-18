"use client";

import { createElement, isValidElement, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useControlsRegistration } from "@/core/orchestration";
import type {
  ControlSlot,
  ControlsUseOptions,
  DefinedControls,
  DefineControlsOptions,
} from "./types";

function resolveSlot(
  slot: ControlSlot | undefined,
  props: Record<string, unknown>,
): ReactNode {
  if (slot == null || slot === false) return null;
  if (isValidElement(slot)) return slot;
  if (typeof slot === "function") return createElement(slot, props);
  return slot;
}

export function defineControls(
  definition: DefineControlsOptions = {},
): DefinedControls {
  const {
    defaultProps = {},
    id = "controls",
    left = null,
    order = 0,
    path = null,
    right = null,
    ...extraConfig
  } = definition;

  return Object.freeze({
    id,
    order,
    use: function useDefinedControls(
      props: Record<string, unknown> = {},
      options: ControlsUseOptions = {},
    ) {
      const pathname = usePathname();
      const targetPath = options.path || path || pathname;
      const mergedProps = { ...defaultProps, ...props };

      const leftContent = resolveSlot(left, mergedProps);
      const rightContent = resolveSlot(right, mergedProps);

      const leftConfig = leftContent
        ? {
            content: leftContent,
            id: `${id}-left`,
            order,
            path: targetPath,
            side: "left",
            ...extraConfig,
            ...options.leftConfig,
          }
        : null;

      const rightConfig = rightContent
        ? {
            content: rightContent,
            id: `${id}-right`,
            order,
            path: targetPath,
            side: "right",
            ...extraConfig,
            ...options.rightConfig,
          }
        : null;

      useControlsRegistration(leftConfig, options);
      useControlsRegistration(rightConfig, options);
    },
  });
}
