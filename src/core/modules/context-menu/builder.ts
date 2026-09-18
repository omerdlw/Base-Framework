"use client";

import { useContextMenuRegistration } from "@/core/orchestration";
import type { ContextMenuConfig, ContextMenuDefinition } from "./types";

export function defineContextMenu(
  definition: Partial<ContextMenuConfig> = {},
): ContextMenuDefinition {
  const {
    classNames = {},
    id = "context-menu",
    items = [],
    onOpen,
    path = null,
    paths = null,
    target = null,
    ...extraConfig
  } = definition;

  return Object.freeze({
    id,
    use: function useDefinedContextMenu(
      options: Partial<ContextMenuConfig> = {},
    ) {
      const config = {
        id,
        target,
        path,
        paths,
        items,
        onOpen,
        classNames,
        ...extraConfig,
        ...options,
      };
      useContextMenuRegistration(config, options);
    },
  });
}
