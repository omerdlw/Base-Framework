import type { Metadata } from "next";
import type { JSX, ReactNode } from "react";
import "./globals.css";
import { geistSans, zuume } from "@/core/tokens/fonts";
import { Providers } from "./providers";

export const metadata: Metadata = {
  description: "Base Framework",
  title: {
    default: "Base Framework",
    template: "%s",
  },
};

export interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistSans.className} ${zuume.variable} bg-black text-white antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
