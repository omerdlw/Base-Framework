"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Z_INDEX } from "@/core/tokens";
import { cn } from "@/core/utils";
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
          className={cn(
            "tooltip-content pointer-events-none select-none z-(--z-tooltip)",
            classes.content,
            classes.root,
          )}
          style={{
            ["--z-tooltip" as string]: Z_INDEX.TOOLTIP,
          }}
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
