"use client";

import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/core/utils";
import { resolveSlotClasses } from "./utils";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  classNames?: Record<string, string>;
}

export function Skeleton({
  ref,
  className,
  classNames = {},
  ...props
}: SkeletonProps) {
  const classes = resolveSlotClasses(className, classNames);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        "skeleton-block rounded-lg",
        classes.root,
        classes.default,
      )}
      {...props}
    />
  );
}

Skeleton.displayName = "Skeleton";
export default Skeleton;
