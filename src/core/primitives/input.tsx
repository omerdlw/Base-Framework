"use client";

import { useTheme } from "@/core/theme";
import { cn } from "@/core/utils";
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
      className={cn("w-full", theme.slots.input, className)}
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
      <div className={cn("flex w-full flex-col gap-1.5", wrapperClassName)}>
        <div
          className={cn(
            "flex items-center justify-between",
            decorationClassName,
          )}
        >
          {renderedDecoration}
        </div>
        {inputElement}
      </div>
    );
  }

  if (decorationPosition === "bottom") {
    return (
      <div className={cn("flex w-full flex-col gap-1.5", wrapperClassName)}>
        {inputElement}
        <div
          className={cn(
            "flex items-center justify-between",
            decorationClassName,
          )}
        >
          {renderedDecoration}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative flex w-full items-center", wrapperClassName)}>
      {inputElement}
      <div
        className={cn(
          "pointer-events-auto",
          decorationPosition === "bottom-right"
            ? "absolute bottom-2.5 right-2.5 z-10"
            : "absolute right-2.5 z-10",
          decorationClassName,
        )}
      >
        {renderedDecoration}
      </div>
    </div>
  );
}

Input.displayName = "Input";
export { Input };
