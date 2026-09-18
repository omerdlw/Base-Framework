"use client";

import { cn, debounce, isObject as isPlainObject } from "@/core/utils";

export { debounce };

export function resolveSlotClasses(
  className: unknown,
  classNames: Record<string, string> = {},
): Record<string, string> {
  const legacyClasses = isPlainObject(classNames) ? classNames : {};

  if (isPlainObject(className)) {
    return { ...legacyClasses, ...(className as Record<string, string>) };
  }

  if (typeof className === "string") {
    return { ...legacyClasses, root: cn(legacyClasses.root, className) };
  }

  return legacyClasses;
}
