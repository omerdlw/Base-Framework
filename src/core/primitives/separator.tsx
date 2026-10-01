"use client";

import { useTheme } from "@/core/theme";
import { cn } from "@/core/utils";
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
      className={cn(
        "shrink-0",
        theme.slots.separator,
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        classes.root,
        classes.default,
      )}
      {...props}
    />
  );
}

Separator.displayName = "Separator";
export { Separator };
