"use client";

import { useTheme } from "@/core/theme";
import { cn } from "@/core/utils";
import { primitivesTheme } from "./theme";
import { resolveSlotClasses } from "./utils";
import { SwitchProps } from "./types";

function Switch({
  ref,
  checked = false,
  className,
  classNames = {},
  disabled = false,
  onCheckedChange,
  onClick,
  thumbClassName,
  type = "button",
  ...props
}: SwitchProps) {
  const theme = useTheme(primitivesTheme);
  const classes = resolveSlotClasses(className, classNames);

  return (
    <button
      ref={ref}
      type={type}
      role="switch"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !disabled) {
          onCheckedChange?.(!checked);
        }
      }}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center transition-colors duration-micro ease-out-quart",
        theme.slots.switch,
        classes.root,
        classes.default,
      )}
      {...props}
    >
      <span
        data-state={checked ? "checked" : "unchecked"}
        className={cn(
          "pointer-events-none block transition-transform duration-micro ease-out-quart will-change-transform",
          theme.slots.switchThumb,
          checked ? theme.slots.switchThumbOn : theme.slots.switchThumbOff,
          classes.thumb,
          thumbClassName,
        )}
      />
    </button>
  );
}

Switch.displayName = "Switch";
export { Switch };
