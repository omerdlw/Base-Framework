"use client";

import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "@/core/utils";
import { resolveSlotClasses } from "./utils";

export interface SwitchProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  ref?: Ref<HTMLButtonElement>;
  checked?: boolean;
  classNames?: Record<string, string>;
  onCheckedChange?: (checked: boolean) => void;
  thumbClassName?: string;
}

export function Switch({
  ref,
  checked = false,
  className,
  classNames = {},
  disabled = false,
  onCheckedChange,
  onClick,
  thumbClassName,
  type = "button",
  ...props
}: SwitchProps) {
  const classes = resolveSlotClasses(className, classNames);

  return (
    <button
      ref={ref}
      type={type}
      role="switch"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !disabled) {
          onCheckedChange?.(!checked);
        }
      }}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        classes.root,
        classes.default,
      )}
      {...props}
    >
      <span
        data-state={checked ? "checked" : "unchecked"}
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-current transition-transform will-change-transform",
          checked ? "translate-x-5" : "translate-x-0",
          classes.thumb,
          thumbClassName,
        )}
      />
    </button>
  );
}

Switch.displayName = "Switch";
export default Switch;
