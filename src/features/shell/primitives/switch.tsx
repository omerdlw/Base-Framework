"use client";

import { useTheme } from "@omerdlw/base-framework/theme";
import { cn } from "@omerdlw/base-framework/utils";
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
      className={cn(theme.slots.switch, classes.root, classes.default)}
      {...props}
    >
      <span
        data-state={checked ? "checked" : "unchecked"}
        className={cn(theme.slots.switchThumb, classes.thumb, thumbClassName)}
      />
    </button>
  );
}

Switch.displayName = "Switch";
export { Switch };
