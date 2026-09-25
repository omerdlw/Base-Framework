"use client";

import { createElement, isValidElement, useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useControlsRegistration } from "@/core/orchestration";
import { useControlsLayout } from "./view";
import type {
  ControlEntry,
  ControlSlot,
  ControlsLayout,
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

export function useControls(
  config?:
    | DefineControlsOptions
    | ControlEntry
    | ControlEntry[]
    | null,
  options?: ControlsUseOptions,
): ControlsLayout | null {
  const pathname = usePathname();
  const targetPath = options?.path || (config as any)?.path || pathname;

  const normalizedEntries = useMemo(() => {
    if (!config) return null;
    if (Array.isArray(config)) return config;
    if (
      typeof config === "object" &&
      !("side" in config) &&
      ("left" in config || "right" in config)
    ) {
      const {
        defaultProps = {},
        id = "controls",
        left = null,
        order = 0,
        right = null,
        ...extra
      } = config as DefineControlsOptions;
      const leftContent = resolveSlot(left, defaultProps);
      const rightContent = resolveSlot(right, defaultProps);
      const entries: Record<string, unknown>[] = [];
      if (leftContent) {
        entries.push({
          content: leftContent,
          id: `${id}-left`,
          order,
          path: targetPath,
          side: "left",
          ...extra,
          ...options?.leftConfig,
        });
      }
      if (rightContent) {
        entries.push({
          content: rightContent,
          id: `${id}-right`,
          order,
          path: targetPath,
          side: "right",
          ...extra,
          ...options?.rightConfig,
        });
      }
      return entries.length > 0 ? entries : null;
    }
    return config;
  }, [config, options?.leftConfig, options?.rightConfig, targetPath]);

  useControlsRegistration(normalizedEntries, options);
  return useControlsLayout();
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

  const baseConfig: DefineControlsOptions = {
    defaultProps,
    id,
    left,
    order,
    path,
    right,
    ...extraConfig,
  };

  return Object.freeze({
    config: baseConfig,
    id,
    order,
    use: function useDefinedControls(
      props: Record<string, unknown> = {},
      options: ControlsUseOptions = {},
    ): ControlsLayout | null {
      return useControls(
        {
          ...baseConfig,
          defaultProps: { ...defaultProps, ...props },
        },
        options,
      );
    },
  });
}
