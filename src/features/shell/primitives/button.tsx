"use client";

import { useTheme } from "@omerdlw/base-framework/theme";
import { cn } from "@omerdlw/base-framework/utils";
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
        <span className={theme.slots.stack}>
          <span className={theme.slots.stackBase}>{children}</span>
          <span className={theme.slots.stackTop}>{loader ?? <Loader />}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

Button.displayName = "Button";
export { Button };
