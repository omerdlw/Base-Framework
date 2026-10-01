import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";

export const metadata: Metadata = {
  title: "Not found",
};

export default function NotFound(): JSX.Element {
  return (
    <main className="center min-h-screen flex-col gap-3 px-6 text-center">
      <p className="font-zuume text-7xl leading-none text-white/90">404</p>
      <p className="text-sm text-white/60">This page could not be found.</p>
      <Link
        href="/"
        className="mt-3 rounded-full bg-white/10 px-5 py-2.5 text-xs font-medium text-white transition-colors duration-micro ease-out-quart hover:bg-white hover:text-black"
      >
        Back home
      </Link>
    </main>
  );
}
