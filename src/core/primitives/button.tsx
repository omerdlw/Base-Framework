"use client";

import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "@/core/utils";
import { resolveSlotClasses } from "./utils";

export interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
  animate?: unknown;
  classNames?: Record<string, string>;
  exit?: unknown;
  initial?: unknown;
  transition?: unknown;
  variant?: "primary" | "secondary" | "ghost" | "danger" | string;
  variants?: unknown;
  whileDrag?: unknown;
  whileFocus?: unknown;
  whileHover?: unknown;
  whileTap?: unknown;
}

function Button({
  ref,
  animate: _animate,
  children,
  className,
  classNames = {},
  disabled = false,
  exit: _exit,
  initial: _initial,
  transition: _transition,
  type = "button",
  variant: _variant,
  variants: _variants,
  whileDrag: _whileDrag,
  whileFocus: _whileFocus,
  whileHover: _whileHover,
  whileTap: _whileTap,
  ...props
}: Props) {
  const classes = resolveSlotClasses(className, classNames);

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(
        "disabled:cursor-not-allowed disabled:opacity-50",
        classes.root,
        classes.default,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

Button.displayName = "Button";
export { Button };
export default Button;
