"use client";

import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/core/utils";
import { resolveSlotClasses } from "./utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  ref?: Ref<HTMLSpanElement>;
  classNames?: Record<string, string>;
}

export function Badge({
  ref,
  children,
  className,
  classNames = {},
  ...props
}: BadgeProps) {
  const classes = resolveSlotClasses(className, classNames);

  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium select-none",
        classes.root,
        classes.default,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

Badge.displayName = "Badge";
export default Badge;
