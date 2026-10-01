"use client";

import { Icon as IconifyIcon } from "@iconify-icon/react";
import { IconProps } from "./types";

function Icon({
  className = "center",
  color,
  icon,
  onClick,
  size = 20,
  ...props
}: IconProps) {
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

Icon.displayName = "Icon";
export { Icon };
