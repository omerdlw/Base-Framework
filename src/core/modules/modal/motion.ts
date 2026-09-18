import { MODAL_POSITIONS } from "./constants";
import type { ModalPosition } from "./types";

export const MODAL_EASINGS = Object.freeze({
  CINEMATIC: Object.freeze([0.76, 0, 0.24, 1] as const),
  EMPHASIZED: Object.freeze([0.16, 1, 0.3, 1] as const),
  EXIT: Object.freeze([0.7, 0, 0.84, 0] as const),
  SOFT: Object.freeze([0.22, 1, 0.36, 1] as const),
  SOFT_EXIT: Object.freeze([0.4, 0, 0.2, 1] as const),
});

const MODAL_TIERS = Object.freeze({
  FAST: {
    distance: 9,
    duration: 0.44,
    ease: MODAL_EASINGS.EMPHASIZED,
    scaleDelta: 0.012,
  },
  MICRO: {
    distance: 4,
    duration: 0.24,
    ease: MODAL_EASINGS.EMPHASIZED,
    scaleDelta: 0.008,
  },
  STANDARD: {
    distance: 18,
    duration: 0.66,
    ease: MODAL_EASINGS.SOFT,
    scaleDelta: 0.018,
  },
  SURFACE: {
    distance: 28,
    duration: 0.96,
    ease: MODAL_EASINGS.CINEMATIC,
    scaleDelta: 0.024,
  },
});

const MODAL_SPRINGS = Object.freeze({
  MICRO: Object.freeze({
    damping: 30,
    mass: 0.28,
    stiffness: 520,
    type: "spring",
  }),
  PANEL: Object.freeze({
    damping: 24,
    mass: 0.8,
    stiffness: 180,
    type: "spring",
  }),
});

function toCssDistance(value: number | string = 0) {
  return typeof value === "number" ? `${value}px` : value;
}

function toGpuTransform({
  scale = 1,
  x = 0,
  y = 0,
}: { scale?: number; x?: number | string; y?: number | string } = {}) {
  return `translate3d(${toCssDistance(x)}, ${toCssDistance(y)}, 0) scale(${scale})`;
}

export const MODAL_MICRO_SPRING = MODAL_SPRINGS.MICRO;
export const MODAL_PANEL_SPRING = MODAL_SPRINGS.PANEL;
export const MODAL_MICRO_TAP_SCALE = 0.97;
export const MODAL_MICRO_TAP = Object.freeze({
  transform: toGpuTransform({
    scale: MODAL_MICRO_TAP_SCALE,
  }),
});
export const MODAL_CONTENT_STAGGER = 0.06;

export const MODAL_CONTENT_VARIANTS: any = Object.freeze({
  exit: {
    filter: "blur(3px)",
    opacity: 0,
    transform: toGpuTransform({
      scale: 0.994,
      y: 3,
    }),
    transition: {
      duration: 0.38,
      ease: MODAL_EASINGS.EXIT,
    },
  },
  hidden: {
    filter: "blur(4px)",
    opacity: 0,
    transform: toGpuTransform({
      scale: 0.992,
      y: MODAL_TIERS.MICRO.distance,
    }),
  },
  visible: {
    filter: "blur(0px)",
    opacity: 1,
    transform: toGpuTransform(),
    transition: {
      delay: 0.08,
      duration: MODAL_TIERS.FAST.duration,
      ease: MODAL_EASINGS.EMPHASIZED,
    },
  },
});

export const MODAL_HEADER_VARIANTS: any = Object.freeze({
  exit: {
    filter: "blur(3px)",
    opacity: 0,
    transition: {
      duration: 0.38,
      ease: MODAL_EASINGS.EXIT,
    },
  },
  hidden: {
    filter: "blur(4px)",
    opacity: 0,
  },
  visible: {
    filter: "blur(0px)",
    opacity: 1,
    transition: {
      delay: 0.03,
      duration: MODAL_TIERS.FAST.duration,
      ease: MODAL_EASINGS.EMPHASIZED,
    },
  },
});

export const MODAL_FOOTER_VARIANTS: any = Object.freeze({
  exit: {
    filter: "blur(3px)",
    opacity: 0,
    transition: {
      duration: 0.38,
      ease: MODAL_EASINGS.EXIT,
    },
  },
  hidden: {
    filter: "blur(4px)",
    opacity: 0,
  },
  visible: {
    filter: "blur(0px)",
    opacity: 1,
    transition: {
      delay: 0.12,
      duration: MODAL_TIERS.FAST.duration,
      ease: MODAL_EASINGS.EMPHASIZED,
    },
  },
});

export const MODAL_LIST_VARIANTS: any = Object.freeze({
  exit: {
    opacity: 0,
    transition: {
      duration: 0.38,
      ease: MODAL_EASINGS.EXIT,
    },
  },
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: MODAL_TIERS.MICRO.duration,
      ease: MODAL_EASINGS.EMPHASIZED,
    },
  },
});

export const MODAL_LIST_ITEM_VARIANTS: any = Object.freeze({
  exit: {
    filter: "blur(3px)",
    opacity: 0,
    transform: toGpuTransform({
      scale: 0.994,
      y: -MODAL_TIERS.MICRO.distance,
    }),
    transition: {
      duration: 0.38,
      ease: MODAL_EASINGS.EXIT,
    },
  },
  hidden: {
    filter: "blur(6px)",
    opacity: 0,
    transform: toGpuTransform({
      scale: 1 - MODAL_TIERS.FAST.scaleDelta,
      y: MODAL_TIERS.FAST.distance,
    }),
  },
  visible: (index = 0) => ({
    filter: "blur(0px)",
    opacity: 1,
    transform: toGpuTransform(),
    transition: {
      delay:
        0.06 +
        Math.min(Math.max(Number(index) || 0, 0) * MODAL_CONTENT_STAGGER, 0.42),
      duration: MODAL_TIERS.FAST.duration,
      ease: MODAL_EASINGS.EMPHASIZED,
    },
  }),
});

function buildVariants(
  tierName: keyof typeof MODAL_TIERS,
  {
    axis,
    direction = 1,
    fullSlide = false,
  }: { axis: "x" | "y"; direction?: number; fullSlide?: boolean },
): any {
  const tier = MODAL_TIERS[tierName];
  const distance = fullSlide ? "100%" : tier.distance;
  const signedDistance =
    direction < 0 ? (fullSlide ? "-100%" : -Number(distance)) : distance;
  const transform =
    axis === "x"
      ? {
          x: signedDistance,
        }
      : {
          y: signedDistance,
        };
  return Object.freeze({
    exit: {
      filter: "blur(6px)",
      opacity: 0,
      transform: toGpuTransform(transform),
      transition: {
        duration: tier.duration * 0.72,
        ease: MODAL_EASINGS.EXIT,
      },
    },
    hidden: {
      filter: "blur(10px)",
      opacity: 0,
      transform: toGpuTransform(transform),
    },
    visible: {
      filter: "blur(0px)",
      opacity: 1,
      transform: toGpuTransform(),
      transition: {
        duration: tier.duration,
        ease: tier.ease,
      },
    },
  });
}

export const modalBackdropVariants: any = Object.freeze({
  exit: {
    opacity: 0,
    transition: {
      duration: 0.38,
      ease: MODAL_EASINGS.EXIT,
    },
  },
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.66,
      ease: MODAL_EASINGS.SOFT,
    },
  },
});

const CENTER_VARIANTS: any = Object.freeze({
  exit: {
    filter: "blur(6px)",
    opacity: 0,
    transform: toGpuTransform({
      scale: 0.98,
      y: 6,
    }),
    transition: {
      duration: 0.38,
      ease: MODAL_EASINGS.EXIT,
    },
  },
  hidden: {
    filter: "blur(10px)",
    opacity: 0,
    transform: toGpuTransform({
      scale: 0.96,
      y: 10,
    }),
  },
  visible: {
    filter: "blur(0px)",
    opacity: 1,
    transform: toGpuTransform(),
  },
});

const BOTTOM_VARIANTS = buildVariants("SURFACE", {
  axis: "y",
  fullSlide: true,
});
const RIGHT_VARIANTS = buildVariants("SURFACE", {
  axis: "x",
  fullSlide: true,
});
const LEFT_VARIANTS = buildVariants("SURFACE", {
  axis: "x",
  direction: -1,
  fullSlide: true,
});
const TOP_VARIANTS = buildVariants("SURFACE", {
  axis: "y",
  direction: -1,
  fullSlide: true,
});

export function getModalPositionVariants(position: ModalPosition): any {
  switch (position) {
    case MODAL_POSITIONS.BOTTOM:
      return BOTTOM_VARIANTS;
    case MODAL_POSITIONS.RIGHT:
      return RIGHT_VARIANTS;
    case MODAL_POSITIONS.LEFT:
      return LEFT_VARIANTS;
    case MODAL_POSITIONS.TOP:
      return TOP_VARIANTS;
    case MODAL_POSITIONS.CENTER:
    default:
      return CENTER_VARIANTS;
  }
}

export function getModalTransition(position: ModalPosition): any {
  return position === MODAL_POSITIONS.CENTER ? MODAL_PANEL_SPRING : undefined;
}

export const MODAL_BACKDROP_VARIANTS = modalBackdropVariants;
export const MODAL_POSITION_VARIANTS = getModalPositionVariants;
