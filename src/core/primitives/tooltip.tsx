"use client";

import type { ReactNode, Ref } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Z_INDEX } from "@/core/tokens";
import { cn } from "@/core/utils";
import { resolveSlotClasses } from "./utils";

export interface TooltipProps extends TooltipPrimitive.TooltipContentProps {
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
  className?: string;
  classNames?: Record<string, string>;
  defaultOpen?: boolean;
  delayMs?: number;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  position?: "top" | "right" | "bottom" | "left";
  text?: ReactNode;
}

export type Props = TooltipProps;

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
export default Tooltip;
