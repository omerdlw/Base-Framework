import type { JSX } from "react";
import { Spinner } from "@/features/shell/primitives";

export default function Loading(): JSX.Element {
  return <Spinner size={30} />;
}
