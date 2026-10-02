"use client";

import { useTheme } from "@omerdlw/base-framework/theme";
import { cn } from "@omerdlw/base-framework/utils";
import { primitivesTheme } from "./theme";
import { InputProps } from "./types";

function Input({
  ref,
  className,
  decoration,
  decorationClassName,
  decorationPosition = "inside",
  disabled = false,
  type = "text",
  value,
  wrapperClassName,
  ...props
}: InputProps) {
  const theme = useTheme(primitivesTheme);
  const inputElement = (
    <input
      ref={ref}
      type={type}
      disabled={disabled}
      value={value}
      className={cn(theme.slots.input, className)}
      {...props}
    />
  );

  if (!decoration) {
    return inputElement;
  }

  const renderedDecoration =
    typeof decoration === "function" ? decoration({ value }) : decoration;

  if (decorationPosition === "top") {
    return (
      <div className={cn(theme.slots.fieldStack, wrapperClassName)}>
        <div className={cn(theme.slots.fieldBar, decorationClassName)}>
          {renderedDecoration}
        </div>
        {inputElement}
      </div>
    );
  }

  if (decorationPosition === "bottom") {
    return (
      <div className={cn(theme.slots.fieldStack, wrapperClassName)}>
        {inputElement}
        <div className={cn(theme.slots.fieldBar, decorationClassName)}>
          {renderedDecoration}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(theme.slots.fieldInline, wrapperClassName)}>
      {inputElement}
      <div
        data-position={decorationPosition}
        className={cn(theme.slots.fieldFloat, decorationClassName)}
      >
        {renderedDecoration}
      </div>
    </div>
  );
}

Input.displayName = "Input";
export { Input };
