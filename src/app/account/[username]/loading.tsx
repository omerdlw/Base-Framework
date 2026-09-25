import type { JSX } from "react";
import { Spinner } from "@/core/primitives/spinner";

export default function AccountProfileLoading(): JSX.Element {
  return (
    <div className="w-screen h-screen center">
      <Spinner size={30} />
    </div>
  );
}
