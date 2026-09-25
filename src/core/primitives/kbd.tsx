"use client";

import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/core/utils";
import { resolveSlotClasses } from "./utils";

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  ref?: Ref<HTMLElement>;
  classNames?: Record<string, string>;
}

export function Kbd({
  ref,
  children,
  className,
  classNames = {},
  ...props
}: KbdProps) {
  const classes = resolveSlotClasses(className, classNames);

  return (
    <kbd
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-1.5 py-0.5 font-mono text-[11px] font-medium leading-none select-none",
        classes.root,
        classes.default,
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}

Kbd.displayName = "Kbd";
export default Kbd;
