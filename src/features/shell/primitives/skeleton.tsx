"use client";

import { useTheme } from "@omerdlw/base-framework/theme";
import { cn } from "@omerdlw/base-framework/utils";
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
      className={cn(theme.slots.skeleton, classes.root, classes.default)}
      {...props}
    />
  );
}

Skeleton.displayName = "Skeleton";
export { Skeleton };
