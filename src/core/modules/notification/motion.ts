const NOTIFICATION_EASINGS = Object.freeze({
  EMPHASIZED: Object.freeze([0.16, 1, 0.3, 1] as const),
  EXIT: Object.freeze([0.7, 0, 0.84, 0] as const),
  SOFT: Object.freeze([0.22, 1, 0.36, 1] as const),
});

const NOTIFICATION_TIERS = Object.freeze({
  FAST: {
    distance: 9,
    duration: 0.44,
    ease: NOTIFICATION_EASINGS.EMPHASIZED,
    scaleDelta: 0.012,
  },
  MICRO: {
    distance: 4,
    duration: 0.24,
    ease: NOTIFICATION_EASINGS.EMPHASIZED,
    scaleDelta: 0.008,
  },
  STANDARD: {
    distance: 18,
    duration: 0.66,
    ease: NOTIFICATION_EASINGS.SOFT,
    scaleDelta: 0.018,
  },
});

function toGpuTransform({
  scale = 1,
  x = 0,
  y = 0,
}: { scale?: number; x?: number; y?: number } = {}) {
  return `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
}

export const NOTIFICATION_MICRO_SPRING = Object.freeze({
  damping: 30,
  mass: 0.28,
  stiffness: 520,
  type: "spring",
} as const);

export const NOTIFICATION_MICRO_TAP_SCALE = 0.97;
export const NOTIFICATION_DRAG_CONSTRAINTS = Object.freeze({
  left: 0,
  right: 240,
} as const);

export const NOTIFICATION_DRAG_ELASTIC = Object.freeze({
  left: 0.05,
  right: 0.7,
} as const);

export const NOTIFICATION_WHILE_DRAG = Object.freeze({
  scale: 0.98,
} as const);

export const NOTIFICATION_CLOSE_TAP = Object.freeze({
  transform: toGpuTransform({
    scale: NOTIFICATION_MICRO_TAP_SCALE,
  }),
});

export const NOTIFICATION_ACTION_TAP = Object.freeze({
  transform: toGpuTransform({
    scale: NOTIFICATION_MICRO_TAP_SCALE,
  }),
});

export const NOTIFICATION_ACTION_TRANSITION = NOTIFICATION_MICRO_SPRING;

export const notificationContentVariants: any = Object.freeze({
  exit: {
    opacity: 0,
    transition: {
      duration: 0.38,
      ease: NOTIFICATION_EASINGS.EXIT,
    },
  },
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      delay: 0.06,
      duration: NOTIFICATION_TIERS.FAST.duration,
      ease: NOTIFICATION_EASINGS.SOFT,
    },
  },
});

export const toastVariants: any = Object.freeze({
  exit: {
    opacity: 0,
    transform: toGpuTransform({
      scale: 0.976,
      x: 28,
    }),
    transition: {
      duration: 0.38,
      ease: NOTIFICATION_EASINGS.EXIT,
    },
  },
  hidden: {
    opacity: 0,
    transform: toGpuTransform({
      scale: 1 - NOTIFICATION_TIERS.STANDARD.scaleDelta,
      x: NOTIFICATION_TIERS.STANDARD.distance,
    }),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(),
    transition: {
      duration: NOTIFICATION_TIERS.FAST.duration,
      ease: NOTIFICATION_EASINGS.EMPHASIZED,
    },
  },
});

export const TOAST_VARIANTS = toastVariants;
export const NOTIFICATION_CONTENT_VARIANTS = notificationContentVariants;
