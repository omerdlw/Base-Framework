"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { useTheme } from "@omerdlw/base-framework/theme";
import { cn } from "@omerdlw/base-framework/utils";
import { primitivesTheme } from "./theme";
import { resolveSlotClasses } from "./utils";
import { TooltipProps } from "./types";

function Tooltip({
  ref,
  children,
  className,
  classNames = {},
  collisionPadding = 8,
  defaultOpen,
  delayMs,
  onOpenChange,
  open,
  position = "top",
  sideOffset = 6,
  text,
  ...props
}: TooltipProps) {
  const theme = useTheme(primitivesTheme);
  const classes = resolveSlotClasses(className, classNames);

  return (
    <TooltipPrimitive.Root
      defaultOpen={defaultOpen}
      delayDuration={delayMs}
      onOpenChange={onOpenChange}
      open={open}
    >
      <TooltipPrimitive.Trigger asChild className={cn(classes.trigger)}>
        {children}
      </TooltipPrimitive.Trigger>

      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          ref={ref}
          side={position}
          align="center"
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className={cn(theme.slots.tooltip, classes.content, classes.root)}
          style={theme.styles.tooltip}
          {...props}
        >
          {text}
          {classes.arrow && (
            <TooltipPrimitive.Arrow className={classes.arrow} />
          )}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

Tooltip.displayName = "Tooltip";
export { Tooltip };
