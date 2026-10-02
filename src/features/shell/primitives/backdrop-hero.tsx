"use client";

import { useTheme } from "@omerdlw/base-framework/theme";
import { cn } from "@omerdlw/base-framework/utils";
import { primitivesTheme } from "./theme";
import { BackdropHeroProps } from "./types";

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

function BackdropHero({
  className,
  color = "var(--black, #000)",
  gradientClassName,
  gradientStyle,
  image,
  imageClassName,
  position = "center 20%",
}: BackdropHeroProps) {
  const theme = useTheme(primitivesTheme);

  if (!image) return null;

  const gradient =
    color === "var(--black, #000)"
      ? BACKDROP_HERO_GRADIENT
      : getBackdropHeroGradient(color);

  return (
    <div aria-hidden="true" className={cn(theme.slots.backdropHero, className)}>
      <div
        className={cn(theme.slots.backdropHeroImage, imageClassName)}
        style={{
          backgroundColor: color,
          backgroundImage: `url(${image})`,
          backgroundPosition: position,
        }}
      />
      <div
        className={cn(theme.slots.backdropHeroGradient, gradientClassName)}
        style={{
          background: gradient,
          ...gradientStyle,
        }}
      />
    </div>
  );
}

BackdropHero.displayName = "BackdropHero";
export { BackdropHero };
