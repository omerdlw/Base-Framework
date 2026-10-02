"use client";

import { useState } from "react";
import { useTheme } from "@omerdlw/base-framework/theme";
import { cn } from "@omerdlw/base-framework/utils";
import { primitivesTheme } from "./theme";
import { getInitials, resolveSlotClasses } from "./utils";
import { AvatarProps } from "./types";

function Avatar({
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
  const theme = useTheme(primitivesTheme);
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
      className={cn(theme.slots.avatar, classes.root, classes.default)}
      {...props}
    >
      {hasValidImage ? (
        <img
          src={src as string}
          alt={alt || name || "Avatar"}
          onError={() => setFailedSrc(src as string)}
          className={cn(theme.slots.avatarImage, classes.image)}
        />
      ) : (
        <span className={cn(theme.slots.avatarFallback, classes.fallback)}>
          {fallback ?? children ?? getInitials(name || alt)}
        </span>
      )}
    </span>
  );
}

Avatar.displayName = "Avatar";
export { Avatar };
