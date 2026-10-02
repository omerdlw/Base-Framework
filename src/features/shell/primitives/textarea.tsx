"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import { useTheme } from "@omerdlw/base-framework/theme";
import { cn } from "@omerdlw/base-framework/utils";
import { primitivesTheme } from "./theme";
import { TextareaProps } from "./types";

function toDimension(value: number | string | undefined): string | undefined {
  if (typeof value === "number") return `${value}px`;
  if (typeof value === "string" && value.trim()) return value;
  return undefined;
}

const RESIZE_MAP = Object.freeze({
  none: "none",
  false: "none",
  y: "y",
  vertical: "y",
  x: "x",
  horizontal: "x",
  both: "both",
  true: "both",
} as const);

function Textarea({
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
  const theme = useTheme(primitivesTheme);
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

  const resizeMode =
    resize !== undefined
      ? RESIZE_MAP[String(resize) as keyof typeof RESIZE_MAP]
      : undefined;

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
      data-resize={resizeMode}
      className={cn(theme.slots.textarea, className)}
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
      <div className={cn(theme.slots.fieldInline, wrapperClassName)}>
        {textareaElement}
        <div
          data-position="bottom-right"
          className={cn(theme.slots.fieldFloat, decorationClassName)}
        >
          {renderedDecoration}
        </div>
      </div>
    );
  }

  if (decorationPosition === "top") {
    return (
      <div className={cn(theme.slots.fieldStack, wrapperClassName)}>
        <div className={cn(theme.slots.fieldBar, decorationClassName)}>
          {renderedDecoration}
        </div>
        {textareaElement}
      </div>
    );
  }

  return (
    <div className={cn(theme.slots.fieldStack, wrapperClassName)}>
      {textareaElement}
      <div className={cn(theme.slots.fieldBar, decorationClassName)}>
        {renderedDecoration}
      </div>
    </div>
  );
}

Textarea.displayName = "Textarea";
export { Textarea };
