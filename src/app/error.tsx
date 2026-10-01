"use client";

import { useEffect, type JSX } from "react";
import { Button } from "@/core/primitives";
import { USER_MESSAGES, report } from "@/core/utils";

export interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({
  error,
  reset,
}: ErrorBoundaryProps): JSX.Element {
  useEffect(() => {
    report("App", error);
  }, [error]);

  return (
    <main className="center min-h-screen flex-col gap-3 px-6 text-center">
      <p className="text-lg font-semibold text-white">Something went wrong</p>
      <p className="text-sm text-white/60">{USER_MESSAGES.generic}</p>
      <Button
        className="mt-3 cursor-pointer rounded-full bg-white/10 px-5 py-2.5 text-xs font-medium text-white transition-colors duration-micro ease-out-quart hover:bg-white hover:text-black"
        onClick={() => reset()}
        type="button"
      >
        Try again
      </Button>
    </main>
  );
}
