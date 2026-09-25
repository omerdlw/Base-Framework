"use client";

import { useContextMenu } from "./provider";
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

  const baseConfig: Partial<ContextMenuConfig> = {
    classNames,
    id,
    items,
    onOpen,
    path,
    paths,
    target,
    ...extraConfig,
  };

  return Object.freeze({
    config: baseConfig,
    id,
    use: function useDefinedContextMenu(
      options: Partial<ContextMenuConfig> = {},
    ) {
      return useContextMenu({ ...baseConfig, ...options }, options);
    },
  });
}
