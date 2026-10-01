"use client";

import { useTheme } from "@/core/theme";
import { cn } from "@/core/utils";
import { primitivesTheme } from "./theme";
import { resolveSlotClasses } from "./utils";
import { SkeletonProps } from "./types";

function Skeleton({
  ref,
  className,
  classNames = {},
  ...props
}: SkeletonProps) {
  const theme = useTheme(primitivesTheme);
  const classes = resolveSlotClasses(className, classNames);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        "skeleton-block",
        theme.slots.skeleton,
        classes.root,
        classes.default,
      )}
      {...props}
    />
  );
}

Skeleton.displayName = "Skeleton";
export { Skeleton };
