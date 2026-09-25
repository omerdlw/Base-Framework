"use client";

import { cn, debounce, isObject as isPlainObject } from "@/core/utils";

export { debounce };

export function resolveSlotClasses<
  TSlots extends object = Record<string, string>,
>(
  className: unknown,
  classNames: TSlots | string = {} as TSlots,
): Record<keyof TSlots | "root", string> {
  const legacyClasses = isPlainObject(classNames)
    ? (classNames as Record<string, string>)
    : {};

  if (isPlainObject(className)) {
    return {
      ...legacyClasses,
      ...(className as Record<string, string>),
    } as Record<keyof TSlots | "root", string>;
  }

  if (typeof className === "string") {
    return {
      ...legacyClasses,
      root: cn(legacyClasses.root, className),
    } as Record<keyof TSlots | "root", string>;
  }

  return legacyClasses as Record<keyof TSlots | "root", string>;
}

