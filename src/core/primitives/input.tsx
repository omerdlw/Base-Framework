"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type InputHTMLAttributes,
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

export interface DecorationContext {
  element: HTMLElement | null;
  value?: unknown;
}

export type DecorationProp =
  ReactNode | ((context: DecorationContext) => ReactNode);

export interface BaseInputProps {
  autoResize?: boolean;
  className?: string;
  decoration?: DecorationProp;
  decorationClassName?: string;
  decorationPosition?: "bottom" | "top" | "inside" | "bottom-right" | string;
  maxHeight?: number | string;
  minHeight?: number | string;
  mode?: "input" | "textarea";
  resize?:
    boolean | "none" | "y" | "vertical" | "x" | "horizontal" | "both" | string;
  wrapperClassName?: string;
}

export type InputProps = BaseInputProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "onChange"> &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size" | "onChange"> & {
    onChange?: (
      event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => void;
    ref?: Ref<HTMLInputElement | HTMLTextAreaElement>;
  };

export type TextareaProps = InputProps & {
  ref?: Ref<HTMLTextAreaElement>;
};

function InputComponent({
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
  mode = "input",
  onChange,
  resize,
  style,
  type = "text",
  value,
  wrapperClassName,
  ...props
}: InputProps) {
  const innerRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [mountedElement, setMountedElement] = useState<
    HTMLInputElement | HTMLTextAreaElement | null
  >(null);

  const setRef = useCallback(
    (element: HTMLInputElement | HTMLTextAreaElement | null) => {
      innerRef.current = element;
      setMountedElement(element);
      if (typeof ref === "function") {
        ref(element);
      } else if (ref && "current" in ref) {
        (
          ref as { current: HTMLInputElement | HTMLTextAreaElement | null }
        ).current = element;
      }
    },
    [ref],
  );

  const isTextarea = mode === "textarea";

  const resolvedMinHeight = toDimension(minHeight);
  const resolvedMaxHeight = toDimension(maxHeight);
  const resizeClass =
    resize !== undefined
      ? RESIZE_MAP[String(resize) as keyof typeof RESIZE_MAP] || ""
      : "";

  const adjustAutoHeight = useCallback(() => {
    const el = innerRef.current;
    if (!el || !isTextarea || !autoResize) return;
    el.style.height = "auto";
    let target = el.scrollHeight;
    if (typeof minHeight === "number") target = Math.max(target, minHeight);
    if (typeof maxHeight === "number") target = Math.min(target, maxHeight);
    el.style.height = `${target}px`;
  }, [autoResize, isTextarea, maxHeight, minHeight]);

  useEffect(() => {
    adjustAutoHeight();
  }, [adjustAutoHeight, value, defaultValue]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (autoResize && isTextarea) {
      adjustAutoHeight();
    }
    onChange?.(event);
  };

  const computedStyle: CSSProperties = {
    ...(resolvedMinHeight ? { minHeight: resolvedMinHeight } : null),
    ...(resolvedMaxHeight ? { maxHeight: resolvedMaxHeight } : null),
    ...style,
  };

  const renderDecoration = (): ReactNode => {
    if (!decoration) return null;
    if (typeof decoration === "function") {
      return decoration({
        element: mountedElement,
        value,
      });
    }
    return decoration;
  };

  const elementNode = isTextarea ? (
    <textarea
      className={cn(
        "w-full disabled:cursor-not-allowed disabled:opacity-50",
        resizeClass,
        className,
      )}
      defaultValue={defaultValue}
      disabled={disabled}
      onChange={handleChange}
      ref={setRef as (instance: HTMLTextAreaElement | null) => void}
      style={computedStyle}
      value={value}
      {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
    />
  ) : (
    <input
      className={cn(
        "w-full disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      defaultValue={defaultValue}
      disabled={disabled}
      onChange={handleChange}
      ref={setRef as (instance: HTMLInputElement | null) => void}
      style={computedStyle}
      type={type}
      value={value}
      {...(props as InputHTMLAttributes<HTMLInputElement>)}
    />
  );

  if (!decoration) {
    return elementNode;
  }

  if (isTextarea) {
    if (
      decorationPosition === "inside" ||
      decorationPosition === "bottom-right"
    ) {
      return (
        <div className={cn("relative w-full", wrapperClassName)}>
          {elementNode}
          <div
            className={cn(
              "pointer-events-auto absolute bottom-2.5 right-2.5 z-10",
              decorationClassName,
            )}
          >
            {renderDecoration()}
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
            {renderDecoration()}
          </div>
          {elementNode}
        </div>
      );
    }

    return (
      <div className={cn("flex w-full flex-col gap-1.5", wrapperClassName)}>
        {elementNode}
        <div
          className={cn(
            "flex items-center justify-between",
            decorationClassName,
          )}
        >
          {renderDecoration()}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative flex w-full items-center", wrapperClassName)}>
      {elementNode}
      <div className={cn("pointer-events-auto", decorationClassName)}>
        {renderDecoration()}
      </div>
    </div>
  );
}

export function Textarea({ ref, ...props }: TextareaProps) {
  return <InputComponent mode="textarea" ref={ref} {...props} />;
}

Textarea.displayName = "Textarea";
InputComponent.displayName = "Input";

export interface InputCompoundComponent {
  (props: InputProps): React.JSX.Element;
  displayName?: string;
  Textarea: typeof Textarea;
}

const Input = InputComponent as unknown as InputCompoundComponent;
Input.Textarea = Textarea;

export { Input };
export default Input;
