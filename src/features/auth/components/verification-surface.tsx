"use client";

import dynamic from "next/dynamic";
import type { SurfaceEntry } from "@/core/modules/nav";
import type {
  VerificationData,
  VerificationSurfaceProps,
} from "./verification-surface-view";

export type { VerificationData, VerificationSurfaceProps };

const DEFAULT_SURFACE_WIDTH = 320;

export const VerificationSurface = dynamic<VerificationSurfaceProps>(
  () =>
    import("./verification-surface-view").then((m) => m.VerificationSurface),
  { ssr: false },
);

export function createVerificationSurfaceEntry(
  data: VerificationData = {},
  config: Partial<SurfaceEntry> = {},
): SurfaceEntry {
  return {
    component: VerificationSurface,
    title: "Verify code",
    props: { data },
    width: DEFAULT_SURFACE_WIDTH,
    ...config,
  };
}

export default VerificationSurface;
