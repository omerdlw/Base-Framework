import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Icon as IconifyIcon } from "@iconify-icon/react";
import {
  ButtonHTMLAttributes,
  ComponentProps,
  ComponentPropsWithoutRef,
  CSSProperties,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  Ref,
  SyntheticEvent,
  TextareaHTMLAttributes,
} from "react";

export interface AdaptiveImageProps extends Omit<
  ComponentPropsWithoutRef<"img">,
  "src" | "alt" | "placeholder"
> {
  mode?: "img" | "next";
  src?: string | null;
  alt?: string;
  className?: string;
  wrapperClassName?: string;
  skeletonClassName?: string;
  fallback?: ReactNode;
  fill?: boolean;
  priority?: boolean;
  preload?: boolean;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  onLoad?: (event: SyntheticEvent<HTMLImageElement, Event>) => void;
  onError?: (event: SyntheticEvent<HTMLImageElement, Event>) => void;
  decoding?: "async" | "auto" | "sync";
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
  quality?: number | string;
  sizes?: string;
}

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  ref?: Ref<HTMLSpanElement>;
  alt?: string;
  classNames?: Record<string, string>;
  fallback?: ReactNode;
  name?: string;
  size?: number | string;
  src?: string | null;
}

export interface BackdropHeroProps {
  className?: string;
  color?: string;
  gradientClassName?: string;
  gradientStyle?: CSSProperties;
  image?: string | null;
  imageClassName?: string;
  position?: string;
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  ref?: Ref<HTMLSpanElement>;
  classNames?: Record<string, string>;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
  classNames?: Record<string, string>;
  loading?: boolean;
  loader?: ReactNode;
}

export interface CheckboxProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange"
> {
  ref?: Ref<HTMLButtonElement>;
  checked?: boolean | "indeterminate";
  classNames?: Record<string, string>;
  icon?: ReactNode;
  onCheckedChange?: (checked: boolean) => void;
}

export interface FullscreenStateProps {
  id?: string;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  lockScroll?: boolean;
  affectGlobalState?: boolean;
}

export interface IconProps extends Omit<
  ComponentProps<typeof IconifyIcon>,
  "icon" | "size"
> {
  className?: string;
  color?: string;
  icon: string | ComponentProps<typeof IconifyIcon>["icon"];
  size?: number | string;
}

export interface InputDecorationContext {
  value?: unknown;
}

export type InputDecoration =
  ReactNode | ((context: InputDecorationContext) => ReactNode);

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  ref?: Ref<HTMLInputElement>;
  decoration?: InputDecoration;
  decorationClassName?: string;
  decorationPosition?: "inside" | "top" | "bottom" | "bottom-right";
  wrapperClassName?: string;
}

export interface LoaderProps {
  children?: ReactNode;
  className?: string;
  size?: number;
  color?: string;
}

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  classNames?: Record<string, string>;
  indicatorClassName?: string;
  max?: number;
  min?: number;
  value?: number | null;
}

export interface SelectOption<T extends string = string> {
  description?: ReactNode;
  disabled?: boolean;
  icon?: string;
  label: ReactNode;
  value: T;
}

export interface SelectClassNames {
  chevron?: string;
  content?: string;
  default?: string;
  description?: string;
  empty?: string;
  label?: string;
  option?: string;
  optionActive?: string;
  optionDescription?: string;
  optionIcon?: string;
  optionLabel?: string;
  optionSelected?: string;
  placeholder?: string;
  root?: string;
  trigger?: string;
  value?: string;
}

export interface SelectProps<T extends string = string> {
  ariaLabel?: string;
  className?: string;
  classNames?: SelectClassNames | string;
  defaultOpen?: boolean;
  defaultValue?: T;
  disabled?: boolean;
  emptyMessage?: ReactNode;
  id?: string;
  label?: ReactNode;
  name?: string;
  onChange?: (value: T, option: SelectOption<T>) => void;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  options: readonly SelectOption<T>[];
  placeholder?: ReactNode;
  value?: T;
}

export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  classNames?: Record<string, string>;
  decorative?: boolean;
  orientation?: "horizontal" | "vertical";
}

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  classNames?: Record<string, string>;
}

export interface SpinnerProps {
  className?: string;
  size?: number;
}

export interface SwitchProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange"
> {
  ref?: Ref<HTMLButtonElement>;
  checked?: boolean;
  classNames?: Record<string, string>;
  onCheckedChange?: (checked: boolean) => void;
  thumbClassName?: string;
}

export interface TextareaDecorationContext {
  value?: unknown;
}

export type TextareaDecoration =
  ReactNode | ((context: TextareaDecorationContext) => ReactNode);

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  ref?: Ref<HTMLTextAreaElement>;
  autoResize?: boolean;
  decoration?: TextareaDecoration;
  decorationClassName?: string;
  decorationPosition?: "inside" | "top" | "bottom" | "bottom-right";
  maxHeight?: number | string;
  minHeight?: number | string;
  resize?:
    boolean | "none" | "y" | "vertical" | "x" | "horizontal" | "both" | string;
  wrapperClassName?: string;
}

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
