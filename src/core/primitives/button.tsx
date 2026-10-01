"use client";

import { useTheme } from "@/core/theme";
import { cn } from "@/core/utils";
import { primitivesTheme } from "./theme";
import { Loader } from "./loader";
import { resolveSlotClasses } from "./utils";
import { ButtonProps } from "./types";

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
  const theme = useTheme(primitivesTheme);
  const classes = resolveSlotClasses(className, classNames);

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading ? true : undefined}
      className={cn(theme.slots.button, classes.root, classes.default)}
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
