"use client";

import type { ReactNode } from "react";
import { cn } from "@/core/utils";

export interface LoaderProps {
  children?: ReactNode;
  className?: string;
  size?: number | string;
  color?: string;
}

const LOADER_STYLES = `
.bbl-loader,
.bbl-loader:before,
.bbl-loader:after {
  border-radius: 50%;
  width: 2.5em;
  height: 2.5em;
  animation-fill-mode: both;
  animation: bblFadInOut 1.8s infinite ease-in-out;
}
.bbl-loader {
  --color-1: currentColor;
  --size: 0.5px;
  color: var(--color-1);
  font-size: calc(7 * var(--size));
  position: relative;
  text-indent: -9999em;
  transform: translateZ(0);
  animation-delay: -0.16s;
  top: -2.5em;
}
.bbl-loader:before,
.bbl-loader:after {
  content: "";
  position: absolute;
  top: 0;
}
.bbl-loader:before {
  left: -3.5em;
  animation-delay: -0.32s;
}
.bbl-loader:after {
  left: 3.5em;
}
@keyframes bblFadInOut {
  0%, 80%, 100% {
    box-shadow: 0 2.5em 0 -1.3em;
  }
  40% {
    box-shadow: 0 2.5em 0 0;
  }
}
`;

export function Loader({ children, className, size, color }: LoaderProps) {
  const loaderDot = (
    <>
      <style href="bbl-loader" precedence="default">
        {LOADER_STYLES}
      </style>
      <span
        className="bbl-loader"
        style={
          {
            ...(size !== undefined
              ? {
                  "--size": typeof size === "number" ? `${size}px` : size,
                }
              : null),
            ...(color ? { "--color-1": color } : null),
          } as React.CSSProperties
        }
      />
    </>
  );

  if (children) {
    return (
      <span
        className={cn(
          "inline-grid place-items-center shrink-0 leading-none select-none pointer-events-none",
          className,
        )}
        role="status"
        aria-label="Loading"
      >
        <span className="invisible col-start-1 row-start-1 select-none">
          {children}
        </span>
        <span className="center col-start-1 row-start-1">{loaderDot}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center shrink-0 leading-none select-none pointer-events-none",
        className,
      )}
      style={{
        height: "1em",
        minWidth: "2.5rem",
      }}
      role="status"
      aria-label="Loading"
    >
      {loaderDot}
    </span>
  );
}

export default Loader;
