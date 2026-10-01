"use client";

import { cn, debounce, isObject as isPlainObject } from "@/core/utils";

export { debounce };

export function resolveSlotClasses<
  TSlots extends object = Record<string, string>,
>(
  className: unknown,
  classNames: TSlots | string = {} as TSlots,
): Record<keyof TSlots | "root", string> {
  const slotClasses = isPlainObject(classNames)
    ? (classNames as Record<string, string>)
    : {};

  if (isPlainObject(className)) {
    return {
      ...slotClasses,
      ...(className as Record<string, string>),
    } as Record<keyof TSlots | "root", string>;
  }

  if (typeof className === "string") {
    return {
      ...slotClasses,
      root: cn(slotClasses.root, className),
    } as Record<keyof TSlots | "root", string>;
  }

  return slotClasses as Record<keyof TSlots | "root", string>;
}

export function getInitials(name?: string): string {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
