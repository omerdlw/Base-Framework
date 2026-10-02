"use client";

import { useTheme } from "@omerdlw/base-framework/theme";
import { cn } from "@omerdlw/base-framework/utils";
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
      className={cn(theme.slots.badge, classes.root, classes.default)}
      {...props}
    >
      {children}
    </span>
  );
}

Badge.displayName = "Badge";
export { Badge };
