import type { TargetAndTransition, Transition } from "motion/react";
import type { BackgroundAnimationConfig } from "./types";

const BACKGROUND_DEFAULT_MOTION = Object.freeze({
  animate: Object.freeze({
    opacity: 1,
  }),
  exit: Object.freeze({
    opacity: 0,
    transition: Object.freeze({
      duration: 0.6,
      ease: Object.freeze([0, 0, 0.2, 1]),
    }),
  }),
  initial: Object.freeze({
    opacity: 0,
  }),
  transition: Object.freeze({
    delay: 0,
    duration: 0.6,
    ease: Object.freeze([0.4, 0, 0.2, 1]),
  }),
});

export const BACKGROUND_EXIT_EASE = Object.freeze([0, 0, 0.2, 1] as const);
export const BACKGROUND_OVERLAY_TRANSITION_PROPERTY = "opacity";
export const BACKGROUND_ANIMATE_PRESENCE_MODE = "sync";
export const BACKGROUND_WILL_CHANGE = "transform, opacity, filter";

export function getBackgroundMotionConfig(
  pageAnimation?: BackgroundAnimationConfig | null,
): {
  animate: TargetAndTransition;
  exit: TargetAndTransition;
  exitDurationFactor: number;
  initial: TargetAndTransition;
  transition: Transition;
} {
  const resolvedAnimation = pageAnimation || {};
  return {
    animate: (resolvedAnimation.animate ??
      BACKGROUND_DEFAULT_MOTION.animate) as TargetAndTransition,
    exit: (resolvedAnimation.exit ??
      BACKGROUND_DEFAULT_MOTION.exit) as TargetAndTransition,
    exitDurationFactor: Number(resolvedAnimation.exitDurationFactor),
    initial: (resolvedAnimation.initial ??
      BACKGROUND_DEFAULT_MOTION.initial) as TargetAndTransition,
    transition: (resolvedAnimation.transition ??
      BACKGROUND_DEFAULT_MOTION.transition) as Transition,
  };
}

export function toCssDuration(seconds: unknown): string {
  const value = Number(seconds);
  return `${Math.max(0, Number.isFinite(value) ? value : 0.6) * 1000}ms`;
}

export function toCssDelay(seconds: unknown): string {
  const value = Number(seconds);
  return `${Math.max(0, Number.isFinite(value) ? value : 0) * 1000}ms`;
}

export function toCssEasing(easing: unknown): string {
  if (Array.isArray(easing)) {
    return `cubic-bezier(${easing.join(", ")})`;
  }
  if (typeof easing === "string" && easing.trim()) {
    return easing;
  }
  return "ease";
}
