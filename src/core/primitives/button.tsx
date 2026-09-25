"use client";

import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/core/utils";
import { Loader } from "./loader";
import { resolveSlotClasses } from "./utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
  classNames?: Record<string, string>;
  loading?: boolean;
  loader?: ReactNode;
}

export type Props = ButtonProps;

function Button({
  ref,
  children,
  className,
  classNames = {},
  disabled = false,
  loading = false,
  loader,
  type = "button",
  ...props
}: ButtonProps) {
  const classes = resolveSlotClasses(className, classNames);

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading ? true : undefined}
      className={cn(
        "disabled:cursor-not-allowed disabled:opacity-50",
        classes.root,
        classes.default,
      )}
      {...props}
    >
      {loading ? (
        <span className="inline-grid place-items-center">
          <span className="invisible col-start-1 row-start-1 select-none">
            {children}
          </span>
          <span className="center col-start-1 row-start-1">
            {loader ?? <Loader />}
          </span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

Button.displayName = "Button";
export { Button };
export default Button;
