const NOTIFICATION_EASINGS = Object.freeze({
  EMPHASIZED: Object.freeze([0.25, 1, 0.35, 1] as const),
  EXIT: Object.freeze([0.25, 1, 0.35, 1] as const),
  SOFT: Object.freeze([0.25, 1, 0.4, 1] as const),
});

function toGpuTransform(y = 0, scale = 1): string {
  return `translate3d(0, ${Math.round(y)}px, 0) scale(${Math.round(scale * 1000) / 1000})`;
}

export const NOTIFICATION_COMPOSITOR_STYLE = Object.freeze({
  WebkitBackfaceVisibility: "hidden" as const,
  WebkitBackdropFilter: "blur(16px)",
  WebkitFontSmoothing: "antialiased" as const,
  backfaceVisibility: "hidden" as const,
  backdropFilter: "blur(16px)",
  transform: "translateZ(0)",
  willChange: "transform, opacity, filter",
});

export const NOTIFICATION_TRANSITION = Object.freeze({
  duration: 0.5,
  ease: NOTIFICATION_EASINGS.EMPHASIZED,
  type: "tween" as const,
});

export const toastVariants: any = Object.freeze({
  exit: {
    filter: "blur(4px)",
    opacity: 0,
    transform: toGpuTransform(-6, 0.98),
    transition: NOTIFICATION_TRANSITION,
  },
  hidden: {
    filter: "blur(4px)",
    opacity: 0,
    transform: toGpuTransform(-10, 0.96),
  },
  visible: {
    filter: "blur(0px)",
    opacity: 1,
    transform: toGpuTransform(0, 1),
    transition: NOTIFICATION_TRANSITION,
  },
});

export const TOAST_VARIANTS = toastVariants;
