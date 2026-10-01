"use client";

import { useTheme } from "@/core/theme";
import { cn } from "@/core/utils";
import { primitivesTheme } from "./theme";
import { resolveSlotClasses } from "./utils";
import { BadgeProps } from "./types";

function Badge({
  ref,
  children,
  className,
  classNames = {},
  ...props
}: BadgeProps) {
  const theme = useTheme(primitivesTheme);
  const classes = resolveSlotClasses(className, classNames);

  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1 select-none",
        theme.slots.badge,
        classes.root,
        classes.default,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

Badge.displayName = "Badge";
export { Badge };
