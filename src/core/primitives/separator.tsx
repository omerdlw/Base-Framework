"use client";

import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/core/utils";
import { resolveSlotClasses } from "./utils";

export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  classNames?: Record<string, string>;
  decorative?: boolean;
  orientation?: "horizontal" | "vertical";
}

export function Separator({
  ref,
  className,
  classNames = {},
  decorative = true,
  orientation = "horizontal",
  ...props
}: SeparatorProps) {
  const classes = resolveSlotClasses(className, classNames);

  return (
    <div
      ref={ref}
      role={decorative ? "none" : "separator"}
      aria-orientation={!decorative ? orientation : undefined}
      className={cn(
        "shrink-0 bg-current/10",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        classes.root,
        classes.default,
      )}
      {...props}
    />
  );
}

Separator.displayName = "Separator";
export default Separator;
