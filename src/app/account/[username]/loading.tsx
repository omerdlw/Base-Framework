import type { JSX } from "react";
import { Spinner } from "@/core/primitives/spinner";

export default function AccountProfileLoading(): JSX.Element {
  return <Spinner size={20} />;
}
