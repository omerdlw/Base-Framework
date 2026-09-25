"use client";

import { useState, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "@/core/utils";
import { resolveSlotClasses } from "./utils";

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  ref?: Ref<HTMLSpanElement>;
  alt?: string;
  classNames?: Record<string, string>;
  fallback?: ReactNode;
  name?: string;
  size?: number | string;
  src?: string | null;
}

function getInitials(name?: string): string {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function Avatar({
  ref,
  alt,
  children,
  className,
  classNames = {},
  fallback,
  name,
  size = 36,
  src,
  style,
  ...props
}: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const classes = resolveSlotClasses(className, classNames);
  const hasValidImage = Boolean(src && src !== failedSrc);
  const resolvedSize = typeof size === "number" ? `${size}px` : size;

  return (
    <span
      ref={ref}
      style={{
        height: resolvedSize,
        width: resolvedSize,
        ...style,
      }}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full select-none",
        classes.root,
        classes.default,
      )}
      {...props}
    >
      {hasValidImage ? (
        <img
          src={src as string}
          alt={alt || name || "Avatar"}
          onError={() => setFailedSrc(src as string)}
          className={cn(
            "h-full w-full object-cover",
            classes.image,
          )}
        />
      ) : (
        <span
          className={cn(
            "flex h-full w-full items-center justify-center text-xs font-medium uppercase",
            classes.fallback,
          )}
        >
          {fallback ?? children ?? getInitials(name || alt)}
        </span>
      )}
    </span>
  );
}

Avatar.displayName = "Avatar";
export default Avatar;
