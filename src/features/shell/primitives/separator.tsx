"use client";

import { useTheme } from "@omerdlw/base-framework/theme";
import { cn } from "@omerdlw/base-framework/utils";
import { primitivesTheme } from "./theme";
import { resolveSlotClasses } from "./utils";
import { SeparatorProps } from "./types";

function Separator({
  ref,
  className,
  classNames = {},
  decorative = true,
  orientation = "horizontal",
  ...props
}: SeparatorProps) {
  const theme = useTheme(primitivesTheme);
  const classes = resolveSlotClasses(className, classNames);

  return (
    <div
      ref={ref}
      role={decorative ? "none" : "separator"}
      aria-orientation={!decorative ? orientation : undefined}
      data-orientation={orientation}
      className={cn(theme.slots.separator, classes.root, classes.default)}
      {...props}
    />
  );
}

Separator.displayName = "Separator";
export { Separator };
