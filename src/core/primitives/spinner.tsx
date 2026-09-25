"use client";

import { cn } from "@/core/utils";
import Icon from "@/core/primitives/icon";

export interface Props {
  className?: string;
  size?: number;
}

export function Spinner({ className = "", size = 15 }: Props) {
  return (
    <div
      className={cn(
        "inline-flex animate-spin items-center justify-center align-middle leading-none",
        className,
      )}
      aria-label="Loading"
      role="status"
    >
      <Icon icon="mingcute:loading-3-fill" size={size} />
    </div>
  );
}
