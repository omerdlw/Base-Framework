"use client";

import { cn } from "@/core/utils";
import { Icon } from "./icon";
import { SpinnerProps } from "./types";

function Spinner({ className = "", size = 15 }: SpinnerProps) {
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

Spinner.displayName = "Spinner";
export { Spinner };
