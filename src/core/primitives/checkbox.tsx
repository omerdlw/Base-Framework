"use client";

import { useTheme } from "@/core/theme";
import { cn } from "@/core/utils";
import { primitivesTheme } from "./theme";
import { Icon } from "./icon";
import { resolveSlotClasses } from "./utils";
import { CheckboxProps } from "./types";

function Checkbox({
  ref,
  checked = false,
  className,
  classNames = {},
  disabled = false,
  icon,
  onCheckedChange,
  onClick,
  type = "button",
  ...props
}: CheckboxProps) {
  const theme = useTheme(primitivesTheme);
  const classes = resolveSlotClasses(className, classNames);
  const isIndeterminate = checked === "indeterminate";
  const isChecked = checked === true;
  const state = isIndeterminate
    ? "indeterminate"
    : isChecked
      ? "checked"
      : "unchecked";

  return (
    <button
      ref={ref}
      type={type}
      role="checkbox"
      aria-checked={isIndeterminate ? "mixed" : isChecked}
      data-state={state}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !disabled) {
          onCheckedChange?.(!isChecked);
        }
      }}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center transition-all duration-micro ease-out-quart",
        theme.slots.checkbox,
        classes.root,
        classes.default,
      )}
      {...props}
    >
      {(isChecked || isIndeterminate) && (
        <span
          data-state={state}
          className={cn(
            "pointer-events-none flex items-center justify-center text-current",
            classes.indicator,
          )}
        >
          {icon ?? (
            <Icon
              icon={
                isIndeterminate
                  ? "solar:minus-square-bold"
                  : "solar:check-read-linear"
              }
              size={14}
            />
          )}
        </span>
      )}
    </button>
  );
}

Checkbox.displayName = "Checkbox";
export { Checkbox };
