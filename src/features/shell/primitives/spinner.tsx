"use client";

import { useTheme } from "@omerdlw/base-framework/theme";
import { cn } from "@omerdlw/base-framework/utils";
import { Icon } from "./icon";
import { primitivesTheme } from "./theme";
import { SpinnerProps } from "./types";

function Spinner({ className = "", size = 15 }: SpinnerProps) {
  const theme = useTheme(primitivesTheme);

  return (
    <div
      className={cn(theme.slots.spinner, className)}
      aria-label="Loading"
      role="status"
    >
      <Icon icon="mingcute:loading-3-fill" size={size} />
    </div>
  );
}

Spinner.displayName = "Spinner";
export { Spinner };
