export const DURATION_TOKENS = Object.freeze({
  INSTANT: 0.08,
  FAST: 0.16,
  BASE: 0.24,
  MODERATE: 0.34,
  SLOW: 0.48,
} as const);

export const EASING_CURVES = Object.freeze({
  OUT_EXPO: [0.16, 1, 0.3, 1] as const,
  OUT_QUART: [0.25, 1, 0.5, 1] as const,
  IN_OUT_CUBIC: [0.65, 0, 0.35, 1] as const,
} as const);

export const SPRING_PRESETS = Object.freeze({
  MICRO: Object.freeze({
    damping: 32,
    mass: 0.6,
    stiffness: 520,
    type: "spring",
  } as const),
  SNAPPY: Object.freeze({
    damping: 28,
    mass: 0.8,
    stiffness: 380,
    type: "spring",
  } as const),
  GENTLE: Object.freeze({
    damping: 30,
    mass: 1,
    stiffness: 260,
    type: "spring",
  } as const),
  BOUNCY: Object.freeze({
    damping: 20,
    mass: 0.85,
    stiffness: 340,
    type: "spring",
  } as const),
} as const);

export const REDUCED_MOTION_TRANSITION = Object.freeze({
  duration: DURATION_TOKENS.INSTANT,
  ease: "linear",
} as const);

export const COMPOSITOR_GPU_STYLE = Object.freeze({
  backfaceVisibility: "hidden",
  transform: "translate3d(0, 0, 0)",
  willChange: "transform, opacity",
} as const);

export const TAP_SCALE_SUBTLE = 0.97;
