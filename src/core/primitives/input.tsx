"use client";

import {
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/core/utils";
import { Textarea } from "./textarea";

export interface InputDecorationContext {
  value?: unknown;
}

export type InputDecoration =
  | ReactNode
  | ((context: InputDecorationContext) => ReactNode);

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  ref?: Ref<HTMLInputElement>;
  decoration?: InputDecoration;
  decorationClassName?: string;
  decorationPosition?: "inside" | "top" | "bottom" | "bottom-right";
  wrapperClassName?: string;
}

export type Props = InputProps;

export function Input({
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
  const inputElement = (
    <input
      ref={ref}
      type={type}
      disabled={disabled}
      value={value}
      className={cn(
        "w-full disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
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

export { Textarea };
export { Input as default };
