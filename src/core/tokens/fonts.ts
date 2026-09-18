import localFont from "next/font/local";

export const geistSans = localFont({
  src: [
    {
      path: "./fonts/geist/Geist-Variable.woff2",
      style: "normal",
      weight: "100 900",
    },
  ],
  variable: "--font-geist-sans",
});

export const zuume = localFont({
  src: [
    {
      path: "./fonts/zuume/Zuume-Bold.woff2",
      style: "normal",
      weight: "700",
    },
  ],
  variable: "--font-zuume",
});

export const fontVariables = `${geistSans.variable} ${zuume.variable}`;
