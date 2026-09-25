"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/core/utils";

function toDimension(value: number | string | undefined): string | undefined {
  if (typeof value === "number") return `${value}px`;
  if (typeof value === "string" && value.trim()) return value;
  return undefined;
}

const RESIZE_MAP = Object.freeze({
  none: "resize-none",
  false: "resize-none",
  y: "resize-y",
  vertical: "resize-y",
  x: "resize-x",
  horizontal: "resize-x",
  both: "resize",
  true: "resize",
} as const);

export interface TextareaDecorationContext {
  value?: unknown;
}

export type TextareaDecoration =
  | ReactNode
  | ((context: TextareaDecorationContext) => ReactNode);

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  ref?: Ref<HTMLTextAreaElement>;
  autoResize?: boolean;
  decoration?: TextareaDecoration;
  decorationClassName?: string;
  decorationPosition?: "inside" | "top" | "bottom" | "bottom-right";
  maxHeight?: number | string;
  minHeight?: number | string;
  resize?:
    | boolean
    | "none"
    | "y"
    | "vertical"
    | "x"
    | "horizontal"
    | "both"
    | string;
  wrapperClassName?: string;
}

export type Props = TextareaProps;

export function Textarea({
  ref,
  autoResize = false,
  className,
  decoration,
  decorationClassName,
  decorationPosition = "bottom",
  defaultValue,
  disabled = false,
  maxHeight,
  minHeight,
  onChange,
  resize,
  style,
  value,
  wrapperClassName,
  ...props
}: TextareaProps) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  const setRef = useCallback(
    (element: HTMLTextAreaElement | null) => {
      innerRef.current = element;
      if (typeof ref === "function") {
        ref(element);
      } else if (ref && "current" in ref) {
        (ref as { current: HTMLTextAreaElement | null }).current = element;
      }
    },
    [ref],
  );

  const resizeClass =
    resize !== undefined
      ? RESIZE_MAP[String(resize) as keyof typeof RESIZE_MAP] || ""
      : "";

  const adjustAutoHeight = useCallback(() => {
    const el = innerRef.current;
    if (!el || !autoResize) return;
    el.style.height = "auto";
    let target = el.scrollHeight;
    if (typeof minHeight === "number") target = Math.max(target, minHeight);
    if (typeof maxHeight === "number") target = Math.min(target, maxHeight);
    el.style.height = `${target}px`;
  }, [autoResize, maxHeight, minHeight]);

  useEffect(() => {
    adjustAutoHeight();
  }, [adjustAutoHeight, value, defaultValue]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (autoResize) {
      adjustAutoHeight();
    }
    onChange?.(event);
  };

  const resolvedMinHeight = toDimension(minHeight);
  const resolvedMaxHeight = toDimension(maxHeight);

  const computedStyle: CSSProperties = {
    ...(resolvedMinHeight ? { minHeight: resolvedMinHeight } : null),
    ...(resolvedMaxHeight ? { maxHeight: resolvedMaxHeight } : null),
    ...style,
  };

  const textareaElement = (
    <textarea
      ref={setRef}
      className={cn(
        "w-full disabled:cursor-not-allowed disabled:opacity-50",
        resizeClass,
        className,
      )}
      defaultValue={defaultValue}
      disabled={disabled}
      onChange={handleChange}
      style={computedStyle}
      value={value}
      {...props}
    />
  );

  if (!decoration) {
    return textareaElement;
  }

  const renderedDecoration =
    typeof decoration === "function" ? decoration({ value }) : decoration;

  if (
    decorationPosition === "inside" ||
    decorationPosition === "bottom-right"
  ) {
    return (
      <div className={cn("relative w-full", wrapperClassName)}>
        {textareaElement}
        <div
          className={cn(
            "pointer-events-auto absolute bottom-2.5 right-2.5 z-10",
            decorationClassName,
          )}
        >
          {renderedDecoration}
        </div>
      </div>
    );
  }

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
        {textareaElement}
      </div>
    );
  }

  return (
    <div className={cn("flex w-full flex-col gap-1.5", wrapperClassName)}>
      {textareaElement}
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

Textarea.displayName = "Textarea";
export { Textarea as default };
