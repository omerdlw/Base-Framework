"use client";

import { useTheme } from "@omerdlw/base-framework/theme";
import { clamp, cn } from "@omerdlw/base-framework/utils";
import { primitivesTheme } from "./theme";
import { resolveSlotClasses } from "./utils";
import { ProgressProps } from "./types";

function Progress({
  ref,
  className,
  classNames = {},
  indicatorClassName,
  max = 100,
  min = 0,
  value = 0,
  ...props
}: ProgressProps) {
  const theme = useTheme(primitivesTheme);
  const classes = resolveSlotClasses(className, classNames);
  const safeMax = max > min ? max : min + 100;
  const isIndeterminate = value === null || value === undefined;
  const clampedValue = isIndeterminate ? min : clamp(value, min, safeMax);
  const ratio = isIndeterminate ? 0.35 : (clampedValue - min) / (safeMax - min);

  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuemin={min}
      aria-valuemax={safeMax}
      aria-valuenow={isIndeterminate ? undefined : clampedValue}
      data-state={isIndeterminate ? "indeterminate" : "determinate"}
      className={cn(theme.slots.progress, classes.root, classes.default)}
      {...props}
    >
      <div
        data-state={isIndeterminate ? "indeterminate" : "determinate"}
        style={{
          transform: `scaleX(${ratio})`,
        }}
        className={cn(
          theme.slots.progressIndicator,
          classes.indicator,
          indicatorClassName,
        )}
      />
    </div>
  );
}

Progress.displayName = "Progress";
export { Progress };
