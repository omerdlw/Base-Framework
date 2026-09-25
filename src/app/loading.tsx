import type { JSX } from "react";
import { Spinner } from "@/core/primitives/spinner";

export default function Loading(): JSX.Element {
  return <Spinner size={30} />;
}
