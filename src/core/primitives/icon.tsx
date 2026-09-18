"use client";

import { Icon as IconifyIcon } from "@iconify-icon/react";
import type { ComponentProps } from "react";

export interface Props extends Omit<
  ComponentProps<typeof IconifyIcon>,
  "icon" | "size"
> {
  className?: string;
  color?: string;
  icon: string | ComponentProps<typeof IconifyIcon>["icon"];
  size?: number | string;
}

export default function Icon({
  className = "center",
  color,
  icon,
  onClick,
  size = 20,
  ...props
}: Props) {
  return (
    <IconifyIcon
      className={className}
      height={size}
      icon={icon}
      onClick={onClick}
      style={{ color }}
      width={size}
      {...props}
    />
  );
}
