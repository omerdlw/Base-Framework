"use client";

import type { HTMLAttributes, Ref } from "react";
import { clamp, cn } from "@/core/utils";
import { resolveSlotClasses } from "./utils";

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  classNames?: Record<string, string>;
  indicatorClassName?: string;
  max?: number;
  min?: number;
  value?: number | null;
}

export function Progress({
  ref,
  className,
  classNames = {},
  indicatorClassName,
  max = 100,
  min = 0,
  value = 0,
  ...props
}: ProgressProps) {
  const classes = resolveSlotClasses(className, classNames);
  const safeMax = max > min ? max : min + 100;
  const isIndeterminate = value === null || value === undefined;
  const clampedValue = isIndeterminate
    ? min
    : clamp(value, min, safeMax);
  const ratio = isIndeterminate
    ? 0.35
    : (clampedValue - min) / (safeMax - min);

  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuemin={min}
      aria-valuemax={safeMax}
      aria-valuenow={isIndeterminate ? undefined : clampedValue}
      data-state={isIndeterminate ? "indeterminate" : "determinate"}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-current/10",
        classes.root,
        classes.default,
      )}
      {...props}
    >
      <div
        data-state={isIndeterminate ? "indeterminate" : "determinate"}
        style={{
          transform: `scaleX(${ratio})`,
        }}
        className={cn(
          "h-full w-full origin-left rounded-full bg-current transition-transform duration-300 ease-out will-change-transform",
          classes.indicator,
          indicatorClassName,
        )}
      />
    </div>
  );
}

Progress.displayName = "Progress";
export default Progress;
