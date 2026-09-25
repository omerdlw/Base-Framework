"use client";

import type { CSSProperties } from "react";
import { cn } from "@/core/utils";

const alphaColor = (color: string, percent: number): string =>
  percent === 100
    ? color
    : `color-mix(in srgb, ${color} ${percent}%, transparent)`;

export function getBackdropHeroGradient(color = "var(--black, #000)"): string {
  return [
    `linear-gradient(to right, ${alphaColor(color, 100)} 0%, ${alphaColor(color, 97)} 2%, ${alphaColor(color, 90)} 5%, ${alphaColor(color, 79)} 8%, ${alphaColor(color, 64)} 12%, ${alphaColor(color, 47)} 16%, ${alphaColor(color, 30)} 20%, ${alphaColor(color, 15)} 24%, ${alphaColor(color, 4)} 27%, transparent 30%, transparent 70%, ${alphaColor(color, 4)} 73%, ${alphaColor(color, 15)} 76%, ${alphaColor(color, 30)} 80%, ${alphaColor(color, 47)} 84%, ${alphaColor(color, 64)} 88%, ${alphaColor(color, 79)} 92%, ${alphaColor(color, 90)} 95%, ${alphaColor(color, 97)} 98%, ${alphaColor(color, 100)} 100%)`,
    `linear-gradient(to bottom, transparent 0%, transparent 28%, ${alphaColor(color, 3)} 38%, ${alphaColor(color, 10)} 48%, ${alphaColor(color, 22)} 58%, ${alphaColor(color, 42)} 68%, ${alphaColor(color, 68)} 78%, ${alphaColor(color, 88)} 88%, ${alphaColor(color, 98)} 95%, ${alphaColor(color, 100)} 100%)`,
  ].join(", ");
}

export const BACKDROP_HERO_GRADIENT = getBackdropHeroGradient();

export const BACKDROP_HERO_GRADIENT_CLASS =
  "pointer-events-none absolute inset-0 z-10";

export interface Props {
  className?: string;
  color?: string;
  gradientClassName?: string;
  gradientStyle?: CSSProperties;
  image?: string | null;
  imageClassName?: string;
  position?: string;
}

export function BackdropHero({
  className,
  color = "var(--black, #000)",
  gradientClassName,
  gradientStyle,
  image,
  imageClassName,
  position = "center 20%",
}: Props) {
  if (!image) return null;

  const gradient =
    color === "var(--black, #000)"
      ? BACKDROP_HERO_GRADIENT
      : getBackdropHeroGradient(color);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative isolate h-80 w-[calc(100%+2rem)] -translate-x-4 overflow-hidden sm:h-96 sm:w-[calc(100%+3rem)] sm:-translate-x-6 lg:h-[clamp(36rem,52vw,44rem)] lg:w-[calc(100%+16rem)] lg:-translate-x-32 xl:h-[clamp(40rem,56vw,48rem)] xl:w-[calc(100%+24rem)] xl:-translate-x-48",
        className,
      )}
    >
      <div
        className={cn("absolute inset-0 bg-cover bg-no-repeat", imageClassName)}
        style={{
          backgroundColor: color,
          backgroundImage: `url(${image})`,
          backgroundPosition: position,
        }}
      />
      <div
        className={cn(BACKDROP_HERO_GRADIENT_CLASS, gradientClassName)}
        style={{
          background: gradient,
          ...gradientStyle,
        }}
      />
    </div>
  );
}

export default BackdropHero;
