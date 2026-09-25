"use client";

import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/core/utils";
import Icon from "./icon";
import { resolveSlotClasses } from "./utils";

export interface CheckboxProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  ref?: Ref<HTMLButtonElement>;
  checked?: boolean | "indeterminate";
  classNames?: Record<string, string>;
  icon?: ReactNode;
  onCheckedChange?: (checked: boolean) => void;
}

export function Checkbox({
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
        "inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md transition-all disabled:cursor-not-allowed disabled:opacity-50",
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
export default Checkbox;
