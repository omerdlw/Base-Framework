import { MODAL_POSITIONS } from "./constants";
import type { ModalPosition } from "./types";

export const MODAL_EASINGS = Object.freeze({
  CINEMATIC: Object.freeze([0.32, 1, 0.32, 1] as const),
  EMPHASIZED: Object.freeze([0.25, 1, 0.35, 1] as const),
  EXIT: Object.freeze([0.25, 1, 0.35, 1] as const),
  FLUID: Object.freeze([0.25, 1, 0.35, 1] as const),
  FLUID_RESIZE: Object.freeze([0.32, 1, 0.32, 1] as const),
  PROGRESSIVE_EXIT: Object.freeze([0.25, 1, 0.35, 1] as const),
  SOFT: Object.freeze([0.25, 1, 0.4, 1] as const),
  SOFT_EXIT: Object.freeze([0.25, 1, 0.35, 1] as const),
} as const);

export const MODAL_TIERS = Object.freeze({
  FAST: Object.freeze({
    distance: 9,
    duration: 0.4,
    ease: MODAL_EASINGS.EMPHASIZED,
    scaleDelta: 0.012,
  }),
  MICRO: Object.freeze({
    distance: 4,
    duration: 0.2,
    ease: MODAL_EASINGS.EMPHASIZED,
    scaleDelta: 0.008,
  }),
  STANDARD: Object.freeze({
    distance: 18,
    duration: 0.6,
    ease: MODAL_EASINGS.SOFT,
    scaleDelta: 0.018,
  }),
  SURFACE: Object.freeze({
    distance: 28,
    duration: 0.8,
    ease: MODAL_EASINGS.CINEMATIC,
    scaleDelta: 0.024,
  }),
} as const);

export const MODAL_SPRINGS = Object.freeze({
  DECK: Object.freeze({
    damping: 28,
    mass: 0.85,
    stiffness: 240,
    type: "spring" as const,
  }),
  MICRO: Object.freeze({
    damping: 32,
    mass: 0.3,
    stiffness: 480,
    type: "spring" as const,
  }),
  PANEL: Object.freeze({
    damping: 28,
    mass: 0.85,
    stiffness: 240,
    type: "spring" as const,
  }),
} as const);

export const MODAL_COMPOSITOR_STYLE = Object.freeze({
  WebkitBackfaceVisibility: "hidden",
  WebkitFontSmoothing: "antialiased",
  backfaceVisibility: "hidden",
  transform: "translateZ(0)",
  willChange: "transform, opacity",
} as const);

function toCssDistance(value: number | string = 0) {
  return typeof value === "number" ? `${Math.round(value)}px` : value;
}

export function toGpuTransform(
  yOrConfig?:
    | number
    | string
    | { scale?: number; x?: number | string; y?: number | string },
  scaleValue: number = 1,
): string {
  if (typeof yOrConfig === "object" && yOrConfig !== null) {
    const xVal = yOrConfig.x ?? 0;
    const yVal = yOrConfig.y ?? 0;
    const sVal = yOrConfig.scale ?? 1;
    const safeScale = Number.parseFloat(sVal as any);
    const roundedScale = Number.isFinite(safeScale)
      ? Math.round(safeScale * 1000) / 1000
      : 1;
    return `translate3d(${toCssDistance(xVal)}, ${toCssDistance(yVal)}, 0) scale(${roundedScale})`;
  }
  const safeY = Number.parseFloat(yOrConfig as any);
  const safeScale = Number.parseFloat(scaleValue as any);
  const roundedY = Number.isFinite(safeY) ? Math.round(safeY) : 0;
  const roundedScale = Number.isFinite(safeScale)
    ? Math.round(safeScale * 1000) / 1000
    : 1;
  return `translate3d(0, ${roundedY}px, 0) scale(${roundedScale})`;
}

export const MODAL_MICRO_SPRING = MODAL_SPRINGS.MICRO;
export const MODAL_PANEL_SPRING = MODAL_SPRINGS.PANEL;
export const MODAL_MICRO_TAP_SCALE = 0.96;
export const MODAL_MICRO_TAP = Object.freeze({
  transform: toGpuTransform({
    scale: MODAL_MICRO_TAP_SCALE,
  }),
});
export const MODAL_CONTENT_STAGGER = 0.05;

export const MODAL_BACKDROP_TRANSITION = Object.freeze({
  duration: 0.8,
  ease: MODAL_EASINGS.FLUID,
  type: "tween" as const,
});

export const MODAL_BACKDROP_EXIT_TRANSITION = Object.freeze({
  duration: 0.5,
  ease: MODAL_EASINGS.FLUID,
  type: "tween" as const,
});

export const MODAL_SURFACE_ENTER_TRANSITION = Object.freeze({
  duration: 0.8,
  ease: MODAL_EASINGS.FLUID,
  type: "tween" as const,
});

export const MODAL_SURFACE_EXIT_TRANSITION = Object.freeze({
  duration: 0.5,
  ease: MODAL_EASINGS.EXIT,
  type: "tween" as const,
});

export const MODAL_BODY_ENTER_TRANSITION = Object.freeze({
  delay: 0.05,
  duration: 0.6,
  ease: MODAL_EASINGS.FLUID,
  type: "tween" as const,
});

export const MODAL_BODY_EXIT_TRANSITION = Object.freeze({
  duration: 0.35,
  ease: MODAL_EASINGS.EXIT,
  type: "tween" as const,
});

export const MODAL_CONTENT_VARIANTS: any = Object.freeze({
  exit: {
    filter: "blur(8px)",
    opacity: 0,
    transform: toGpuTransform({
      scale: 0.98,
      y: 12,
    }),
    transition: MODAL_BODY_EXIT_TRANSITION,
  },
  hidden: {
    filter: "blur(8px)",
    opacity: 0,
    transform: toGpuTransform({
      scale: 0.98,
      y: 12,
    }),
  },
  visible: {
    filter: "blur(0px)",
    opacity: 1,
    transform: toGpuTransform(),
    transition: MODAL_BODY_ENTER_TRANSITION,
  },
});

export const MODAL_HEADER_VARIANTS: any = Object.freeze({
  exit: {
    filter: "blur(4px)",
    opacity: 0,
    transform: toGpuTransform({
      scale: 0.99,
      y: -6,
    }),
    transition: {
      duration: 0.3,
      ease: MODAL_EASINGS.EXIT,
    },
  },
  hidden: {
    filter: "blur(4px)",
    opacity: 0,
    transform: toGpuTransform({
      scale: 0.99,
      y: -6,
    }),
  },
  visible: {
    filter: "blur(0px)",
    opacity: 1,
    transform: toGpuTransform(),
    transition: {
      delay: 0.02,
      duration: 0.5,
      ease: MODAL_EASINGS.FLUID,
    },
  },
});

export const MODAL_FOOTER_VARIANTS: any = Object.freeze({
  exit: {
    filter: "blur(4px)",
    opacity: 0,
    transform: toGpuTransform({
      scale: 0.99,
      y: 6,
    }),
    transition: {
      duration: 0.3,
      ease: MODAL_EASINGS.EXIT,
    },
  },
  hidden: {
    filter: "blur(4px)",
    opacity: 0,
    transform: toGpuTransform({
      scale: 0.99,
      y: 6,
    }),
  },
  visible: {
    filter: "blur(0px)",
    opacity: 1,
    transform: toGpuTransform(),
    transition: {
      delay: 0.08,
      duration: 0.5,
      ease: MODAL_EASINGS.FLUID,
    },
  },
});

export const MODAL_LIST_VARIANTS: any = Object.freeze({
  exit: {
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: MODAL_EASINGS.EXIT,
    },
  },
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: MODAL_EASINGS.FLUID,
    },
  },
});

export const MODAL_LIST_ITEM_VARIANTS: any = Object.freeze({
  exit: {
    filter: "blur(4px)",
    opacity: 0,
    transform: toGpuTransform({
      scale: 0.985,
      y: -6,
    }),
    transition: {
      duration: 0.3,
      ease: MODAL_EASINGS.EXIT,
    },
  },
  hidden: {
    filter: "blur(4px)",
    opacity: 0,
    transform: toGpuTransform({
      scale: 0.985,
      y: 8,
    }),
  },
  visible: (index = 0) => ({
    filter: "blur(0px)",
    opacity: 1,
    transform: toGpuTransform(),
    transition: {
      delay:
        0.04 +
        Math.min(Math.max(Number(index) || 0, 0) * MODAL_CONTENT_STAGGER, 0.35),
      duration: 0.4,
      ease: MODAL_EASINGS.FLUID,
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
      opacity: 0,
      transform: toGpuTransform(transform),
      transition: MODAL_SURFACE_EXIT_TRANSITION,
    },
    hidden: {
      opacity: 0,
      transform: toGpuTransform(transform),
    },
    visible: {
      opacity: 1,
      transform: toGpuTransform(),
      transition: MODAL_SURFACE_ENTER_TRANSITION,
    },
  });
}

export const modalBackdropVariants: any = Object.freeze({
  exit: {
    opacity: 0,
    transition: MODAL_BACKDROP_EXIT_TRANSITION,
  },
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: MODAL_BACKDROP_TRANSITION,
  },
});

const CENTER_VARIANTS: any = Object.freeze({
  exit: {
    opacity: 0,
    transform: toGpuTransform({
      scale: 0.96,
      y: 8,
    }),
    transition: {
      duration: 0.35,
      ease: MODAL_EASINGS.EXIT,
    },
  },
  hidden: {
    opacity: 0,
    transform: toGpuTransform({
      scale: 0.95,
      y: 12,
    }),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(),
    transition: {
      duration: MODAL_TIERS.STANDARD.duration,
      ease: MODAL_EASINGS.FLUID,
    },
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
