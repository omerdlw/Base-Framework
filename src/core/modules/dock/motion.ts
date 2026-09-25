import { DOCK_CARD_DIMENSIONS } from "./constants";

const DOCK_STANDARD_EASE = Object.freeze([0.25, 1, 0.35, 1] as const);
const DOCK_RESIZE_EASE = Object.freeze([0.32, 1, 0.32, 1] as const);
const DOCK_SOFT_EASE = Object.freeze([0.25, 1, 0.4, 1] as const);

export const DOCK_EASINGS = Object.freeze({
  FLUID: DOCK_STANDARD_EASE,
  FLUID_RESIZE: DOCK_RESIZE_EASE,
  PROGRESSIVE_EXIT: DOCK_STANDARD_EASE,
  CINEMATIC: DOCK_RESIZE_EASE,
  EMPHASIZED: DOCK_STANDARD_EASE,
  SOFT: DOCK_SOFT_EASE,
  EXIT: DOCK_STANDARD_EASE,
} as const);

export const DOCK_TIERS = Object.freeze({
  MICRO: Object.freeze({
    duration: 0.2,
    distance: 4,
    scaleDelta: 0.008,
    ease: DOCK_EASINGS.EMPHASIZED,
  }),
  FAST: Object.freeze({
    duration: 0.4,
    distance: 9,
    scaleDelta: 0.012,
    ease: DOCK_EASINGS.EMPHASIZED,
  }),
  STANDARD: Object.freeze({
    duration: 0.6,
    distance: 18,
    scaleDelta: 0.018,
    ease: DOCK_EASINGS.SOFT,
  }),
  SURFACE: Object.freeze({
    duration: 0.8,
    distance: 28,
    scaleDelta: 0.024,
    ease: DOCK_EASINGS.CINEMATIC,
  }),
} as const);

export const DOCK_SPRINGS = Object.freeze({
  PRESS: Object.freeze({
    type: "spring" as const,
    stiffness: 480,
    damping: 32,
    mass: 0.3,
  }),
  BADGE: Object.freeze({
    type: "spring" as const,
    stiffness: 360,
    damping: 20,
    mass: 0.42,
  }),
  DECK: Object.freeze({
    type: "spring" as const,
    stiffness: 240,
    damping: 28,
    mass: 0.85,
  }),
  PEEK: Object.freeze({
    type: "spring" as const,
    stiffness: 260,
    damping: 26,
    mass: 0.8,
  }),
  SCRUBBER_TOOLTIP: Object.freeze({
    damping: 28,
    stiffness: 350,
  }),
} as const);

export const DOCK_STAGGER_TIMINGS = Object.freeze({
  EXPAND: 0.05,
  COLLAPSE: 0.05,
  PEEK: 0.05,
  STANDARD: 0.05,
  FAST: 0.05,
} as const);

export const DOCK_STAGGER_DELAY = DOCK_STAGGER_TIMINGS.STANDARD;

export const DOCK_SURFACE_CHOREOGRAPHY_TIMINGS = Object.freeze({
  ACTION_DISMISS_MS: 300,
  ACTION_DISMISS_SETTLE_MS: 0,
  HEADER_SWAP_MS: 0,
  HEADER_SWAP_SETTLE_MS: 0,
  BODY_ENTER_MS: 800,
  BODY_EXIT_MS: 800,
  BODY_COLLAPSE_SETTLE_MS: 0,
  HEADER_RESTORE_MS: 300,
  RESTORE_SETTLE_MS: 0,
} as const);

export const DOCK_COMPACT_RESTORE_DURATION_MS = 400;
export const DOCK_COMPACT_TO_EXPAND_DELAY_MS = DOCK_COMPACT_RESTORE_DURATION_MS;
export const DOCK_COMPACT_TO_SURFACE_DELAY_MS = 400;
export const DOCK_SURFACE_HEADER_REVEAL_DELAY_MS = 200;
export const DOCK_SURFACE_EXIT_SETTLE_MS = 800;
export const DOCK_SURFACE_CLOSE_TO_COMPACT_DELAY_MS = 800;
export const DOCK_TAP_SCALE = 0.96;

export const DOCK_SURFACE_DRAG_CONSTRAINTS = Object.freeze({
  top: 0,
  bottom: 0,
} as const);

export const DOCK_SURFACE_DRAG_ELASTIC = Object.freeze({
  top: 0.05,
  bottom: 0.5,
} as const);

export const DOCK_SURFACE_DRAG_THRESHOLDS = Object.freeze({
  DISMISS_OFFSET_Y: 65,
  DISMISS_VELOCITY_Y: 400,
} as const);

export const DOCK_SURFACE_DRAG_INTERPOLATION = Object.freeze({
  DRAG_RANGE: Object.freeze([0, 180] as const),
  OPACITY_RANGE: Object.freeze([1, 0.75] as const),
  SCALE_RANGE: Object.freeze([1, 0.96] as const),
} as const);

export const DOCK_SURFACE_DRAG = Object.freeze({
  CONSTRAINTS: DOCK_SURFACE_DRAG_CONSTRAINTS,
  ELASTIC: DOCK_SURFACE_DRAG_ELASTIC,
  THRESHOLDS: DOCK_SURFACE_DRAG_THRESHOLDS,
  INTERPOLATION: DOCK_SURFACE_DRAG_INTERPOLATION,
} as const);

export const DOCK_COMPOSITOR_STYLE = Object.freeze({
  willChange: "transform, opacity, filter",
  WebkitBackfaceVisibility: "hidden",
  WebkitFontSmoothing: "antialiased",
  backfaceVisibility: "hidden",
  transform: "translateZ(0)",
} as const);

export const DOCK_STACK_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: DOCK_TIERS.STANDARD.duration,
  ease: DOCK_EASINGS.SOFT,
});

export const DOCK_COMPACT_STACK_ENTER_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.4,
  ease: DOCK_EASINGS.FLUID,
});

export const DOCK_COMPACT_STACK_EXIT_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.4,
  ease: DOCK_EASINGS.FLUID,
});

export const DOCK_CARD_HEIGHT_OPEN_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.8,
  ease: DOCK_EASINGS.FLUID,
});

export const DOCK_CARD_HEIGHT_CLOSE_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.8,
  ease: DOCK_EASINGS.FLUID,
});

export const DOCK_CARD_EXPAND_TRANSITION = DOCK_CARD_HEIGHT_OPEN_TRANSITION;

export const DOCK_SURFACE_BODY_ENTER_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.8,
  ease: DOCK_EASINGS.FLUID,
});

export const DOCK_SURFACE_BODY_EXIT_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.8,
  ease: DOCK_EASINGS.FLUID,
});

export const DOCK_SURFACE_RESIZE_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.6,
  ease: DOCK_EASINGS.FLUID_RESIZE,
  height: {
    type: "tween" as const,
    duration: 0.6,
    ease: DOCK_EASINGS.FLUID_RESIZE,
  },
  width: {
    type: "tween" as const,
    duration: 0.6,
    ease: DOCK_EASINGS.FLUID_RESIZE,
  },
});

export const DOCK_SURFACE_BODY_STEP_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.5,
  ease: DOCK_EASINGS.FLUID_RESIZE,
});

export const DOCK_SURFACE_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: DOCK_TIERS.SURFACE.duration,
  ease: DOCK_EASINGS.FLUID,
});

export const DOCK_ACTION_DISMISS_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.3,
  ease: DOCK_EASINGS.EXIT,
});

export const DOCK_HEADER_SWAP_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.5,
  ease: DOCK_EASINGS.FLUID,
});

export const DOCK_SURFACE_CONTROLS_CONTAINER_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.4,
  ease: DOCK_EASINGS.FLUID,
});

export const DOCK_SURFACE_CONTROLS_CONTAINER_EXIT_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.4,
  ease: DOCK_EASINGS.FLUID,
});

export const DOCK_SURFACE_CONTROLS_ITEM_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.3,
  ease: DOCK_EASINGS.FLUID,
});

export const DOCK_SURFACE_CONTROLS_ITEM_EXIT_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.3,
  ease: DOCK_EASINGS.FLUID,
});

export const DOCK_SURFACE_CONTROLS_ACTION_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.3,
  ease: DOCK_EASINGS.FLUID,
});

export const DOCK_SURFACE_CONTROLS_ACTION_EXIT_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.3,
  ease: DOCK_EASINGS.FLUID,
});

export const DOCK_SURFACE_EXTENSIONS_ENTER_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.5,
  ease: DOCK_EASINGS.CINEMATIC,
});

export const DOCK_SURFACE_EXTENSIONS_EXIT_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.4,
  ease: DOCK_EASINGS.EXIT,
});

export const DOCK_CARD_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: DOCK_TIERS.STANDARD.duration,
  ease: DOCK_EASINGS.FLUID,
});

export const DOCK_CARD_COLLAPSE_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.6,
  ease: DOCK_EASINGS.EXIT,
});

export const DOCK_PEEK_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.4,
  ease: DOCK_EASINGS.SOFT,
});

export const DOCK_COMPACT_CONTENT_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.2,
  ease: DOCK_EASINGS.EXIT,
});

export const DOCK_COMPACT_RESTORE_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.4,
  ease: DOCK_EASINGS.EMPHASIZED,
});

export const DOCK_CARD_SPRING = DOCK_SPRINGS.DECK;
export const DOCK_PEEK_SPRING = DOCK_SPRINGS.PEEK;

export const DOCK_BACKDROP_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.8,
  ease: DOCK_EASINGS.FLUID,
});

export const DOCK_BACKDROP_EXPAND_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.6,
  ease: DOCK_EASINGS.EMPHASIZED,
});

export const DOCK_BACKDROP_COLLAPSE_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.8,
  ease: DOCK_EASINGS.FLUID,
});

export function getDockBackdropTransition({
  expanded = false,
  isSurface = false,
}: {
  expanded?: boolean;
  isSurface?: boolean;
} = {}) {
  if (isSurface) {
    return DOCK_BACKDROP_TRANSITION;
  }
  if (expanded) {
    return DOCK_BACKDROP_EXPAND_TRANSITION;
  }
  return DOCK_BACKDROP_COLLAPSE_TRANSITION;
}

export const DOCK_FADE_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: DOCK_TIERS.STANDARD.duration,
  ease: DOCK_EASINGS.EMPHASIZED,
});

export const DOCK_TEXT_ENTER_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.6,
  ease: DOCK_EASINGS.EMPHASIZED,
});

export const DOCK_TEXT_EXIT_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.4,
  ease: DOCK_EASINGS.EXIT,
});

export const DOCK_ICON_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.3,
  ease: DOCK_EASINGS.SOFT,
});

export const DOCK_BREADCRUMBS_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.5,
  ease: DOCK_EASINGS.EMPHASIZED,
});

export const DOCK_HUD_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.6,
  ease: DOCK_EASINGS.CINEMATIC,
});

export const DOCK_COMPACT_TITLE_ENTER_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.2,
  delay: 0.1,
  ease: DOCK_EASINGS.EMPHASIZED,
});

export const DOCK_COMPACT_TITLE_EXIT_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.2,
  ease: DOCK_EASINGS.EXIT,
});

export const DOCK_STAGGER_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.6,
  ease: DOCK_EASINGS.EMPHASIZED,
});

export const DOCK_MICRO_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: DOCK_TIERS.MICRO.duration,
  ease: DOCK_TIERS.MICRO.ease,
});

export const DOCK_ACTIVE_INDICATOR_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.5,
  ease: DOCK_EASINGS.SOFT,
});

export const DOCK_RESULTS_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.8,
  ease: DOCK_EASINGS.CINEMATIC,
});

export const DOCK_RESULTS_EXIT_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.5,
  ease: DOCK_EASINGS.EXIT,
});

export const DOCK_RESULTS_STAGGER_DELAY = DOCK_STAGGER_TIMINGS.STANDARD;

export const DOCK_BUTTON_TRANSITION = DOCK_SPRINGS.PRESS;
export const DOCK_BADGE_TRANSITION = DOCK_SPRINGS.BADGE;

export const DOCK_SCRUBBER_TOOLTIP_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.3,
  ease: DOCK_EASINGS.EMPHASIZED,
});

export const DOCK_SCRUBBER_TOOLTIP_SPRING = DOCK_SPRINGS.SCRUBBER_TOOLTIP;

export const DOCK_MEDIA_VOLUME_FILL_TRANSITION =
  "width 240ms cubic-bezier(0.16, 1, 0.3, 1)";
export const DOCK_MEDIA_VOLUME_THUMB_POSITION_TRANSITION =
  "left 240ms cubic-bezier(0.16, 1, 0.3, 1)";

export const DOCK_SKELETON_PULSE_CLASS = "animate-pulse";

export function toGpuTransform(y: any = 0, scale: any = 1): string {
  const safeY = Number.parseFloat(y);
  const safeScale = Number.parseFloat(scale);
  const roundedY = Number.isFinite(safeY) ? Math.round(safeY) : 0;
  const roundedScale = Number.isFinite(safeScale)
    ? Math.round(safeScale * 1000) / 1000
    : 1;
  return `translate3d(0, ${roundedY}px, 0) scale(${roundedScale})`;
}

export const dockSurfaceDragTransformTemplate = ({
  y,
  scale,
}: {
  y: any;
  scale: any;
}) => toGpuTransform(y, scale);

export const dockActionVariants = Object.freeze({
  idle: {
    transform: toGpuTransform(0, 1),
  },
  hover: {
    transform: toGpuTransform(0, 1),
  },
  tap: {
    transform: toGpuTransform(0, DOCK_TAP_SCALE),
  },
});

export const dockMediaVolumeThumbVariants = Object.freeze({
  idle: Object.freeze({
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.5)",
    scale: 1,
  }),
  dragging: Object.freeze({
    boxShadow: "0 0 8px rgba(255, 255, 255, 0.5)",
    scale: 1.25,
  }),
});

export function buildVariants(
  tierName: keyof typeof DOCK_TIERS,
  { distanceScale = 0 }: { distanceScale?: number } = {},
) {
  const tier = DOCK_TIERS[tierName];
  const distance = Math.round(tier.distance * distanceScale);
  const hidden: any = {
    opacity: 0,
  };
  const visible: any = {
    opacity: 1,
    transition: {
      duration: tier.duration,
      ease: tier.ease,
    },
  };
  const exit: any = {
    opacity: 0,
    transition: {
      duration: tier.duration,
      ease: tier.ease,
    },
  };
  if (distance) {
    hidden.transform = toGpuTransform(distance, 1 - tier.scaleDelta);
    visible.transform = toGpuTransform(0);
    exit.transform = toGpuTransform(distance, 1 - tier.scaleDelta);
  }
  return Object.freeze({
    hidden,
    visible,
    exit,
  });
}

export const slideFadeVariants = buildVariants("SURFACE", {
  distanceScale: 0,
});

export const textCrossfadeVariants = buildVariants("STANDARD", {
  distanceScale: 0.42,
});

export const staggerItemVariants = buildVariants("FAST", {
  distanceScale: 0.75,
});

export const dockHeaderSwapVariants = Object.freeze({
  hidden: {
    opacity: 0,
    filter: "blur(4px)",
    transform: toGpuTransform(6, 0.99),
  },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    transform: toGpuTransform(0),
    transition: {
      duration: 0.6,
      ease: DOCK_EASINGS.FLUID,
    },
  },
  exit: {
    opacity: 0,
    filter: "blur(4px)",
    transform: toGpuTransform(-6, 0.99),
    transition: {
      duration: 0.6,
      ease: DOCK_EASINGS.FLUID,
    },
  },
});

export const dockExtensionShelfVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(6, 0.99),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0, 1),
    transition: {
      duration: 0.4,
      ease: DOCK_EASINGS.CINEMATIC,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-6, 0.99),
    transition: {
      duration: 0.4,
      ease: DOCK_EASINGS.EXIT,
    },
  },
});

export const dockHeaderRestoreVariants = Object.freeze({
  hidden: {
    opacity: 0,
    filter: "blur(4px)",
    transform: toGpuTransform(-6, 0.99),
  },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    transform: toGpuTransform(0),
    transition: {
      duration: 0.5,
      ease: DOCK_EASINGS.FLUID,
    },
  },
  exit: {
    opacity: 0,
    filter: "blur(4px)",
    transform: toGpuTransform(6, 0.99),
    transition: {
      duration: 0.5,
      ease: DOCK_EASINGS.FLUID,
    },
  },
});

export const dockSurfaceControlsContainerVariants = Object.freeze({
  hidden: (targetY: any = 0) => ({
    opacity: 0,
    y: (Number(targetY) || 0) + 8,
    scale: 0.92,
    transition: DOCK_SURFACE_CONTROLS_CONTAINER_EXIT_TRANSITION,
  }),
  visible: (targetY: any = 0) => ({
    opacity: 1,
    y: Number(targetY) || 0,
    scale: 1,
    transition: DOCK_SURFACE_CONTROLS_CONTAINER_TRANSITION,
  }),
  exit: (targetY: any = 0) => ({
    opacity: 0,
    y: (Number(targetY) || 0) + 8,
    scale: 0.92,
    transition: DOCK_SURFACE_CONTROLS_CONTAINER_EXIT_TRANSITION,
  }),
});

export const dockSurfaceControlsActionVariants = Object.freeze({
  hidden: {
    opacity: 0,
    scale: 0.9,
    width: 0,
    marginRight: -2,
  },
  visible: {
    opacity: 1,
    scale: 1,
    width: "auto",
    marginRight: 0,
    transition: DOCK_SURFACE_CONTROLS_ACTION_TRANSITION,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    width: 0,
    marginRight: -2,
    transition: DOCK_SURFACE_CONTROLS_ACTION_EXIT_TRANSITION,
  },
});

export const dockSurfaceControlsBackVariants = Object.freeze({
  hidden: {
    opacity: 0,
    scale: 0.85,
    width: 0,
    marginRight: -2,
  },
  visible: {
    opacity: 1,
    scale: 1,
    width: "auto",
    marginRight: 0,
    transition: DOCK_SURFACE_CONTROLS_ITEM_TRANSITION,
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    width: 0,
    marginRight: -2,
    transition: DOCK_SURFACE_CONTROLS_ITEM_EXIT_TRANSITION,
  },
});

export const dockSurfaceControlsCloseVariants = Object.freeze({
  hidden: {
    opacity: 0,
    scale: 0.85,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: DOCK_SURFACE_CONTROLS_ITEM_TRANSITION,
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    transition: DOCK_SURFACE_CONTROLS_ITEM_EXIT_TRANSITION,
  },
});

export const dockSurfaceControlsVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: "translate3d(0px, 14px, 0) scale(0.92)",
  },
  visible: (customIndex: any = 0) => ({
    opacity: 1,
    transform: "translate3d(0px, 0px, 0) scale(1)",
    transition: {
      duration: 0.6,
      delay: (Number(customIndex) || 0) * 0.05,
      ease: DOCK_EASINGS.CINEMATIC,
    },
  }),
  exit: {
    opacity: 0,
    transform: "translate3d(0px, 10px, 0) scale(0.95)",
    transition: {
      duration: 0.6,
      ease: DOCK_EASINGS.CINEMATIC,
    },
  },
});

export const dockCommandBarSwapVariants = Object.freeze({
  hidden: {
    opacity: 0,
    filter: "blur(4px)",
    transform: "translate3d(8px, 0, 0) scale(0.92)",
  },
  visible: (customIndex: any = 0) => ({
    opacity: 1,
    filter: "blur(0px)",
    transform: "translate3d(0px, 0, 0) scale(1)",
    transition: {
      duration: 0.4,
      delay: (Number(customIndex) || 0) * 0.05,
      ease: DOCK_EASINGS.FLUID,
    },
  }),
  exit: (customIndex: any = 0) => ({
    opacity: 0,
    filter: "blur(4px)",
    transform: "translate3d(8px, 0, 0) scale(0.92)",
    transition: {
      duration: 0.4,
      delay: (Number(customIndex) || 0) * 0.03,
      ease: DOCK_EASINGS.FLUID,
    },
  }),
});

export const dockSurfaceBodyVariants = Object.freeze({
  hidden: {
    opacity: 0,
    filter: "blur(8px)",
    transform: toGpuTransform(20, 0.98),
  },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    transform: toGpuTransform(0),
    transition: DOCK_SURFACE_BODY_ENTER_TRANSITION,
  },
  exit: {
    opacity: 0,
    filter: "blur(8px)",
    transform: toGpuTransform(20, 0.98),
    transition: DOCK_SURFACE_BODY_EXIT_TRANSITION,
  },
});

export const dockSurfaceExtensionsVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(-18, 0.85),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(-28, 0.85),
    transition: {
      duration: 0.5,
      ease: DOCK_EASINGS.CINEMATIC,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-18, 0.85),
    transition: {
      duration: 0.5,
      ease: DOCK_EASINGS.EXIT,
    },
  },
});

export const dockActionDismissVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(10, 0.98),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    transition: {
      duration: 0.3,
      ease: DOCK_EASINGS.SOFT,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-8, 0.98),
    transition: {
      duration: 0.3,
      ease: DOCK_EASINGS.EXIT,
    },
  },
});

export const dockListItemVariants = Object.freeze({
  hidden: staggerItemVariants.hidden,
  visible: (index: any = 0) => ({
    ...staggerItemVariants.visible,
    transition: {
      ...DOCK_STAGGER_TRANSITION,
      delay: Math.min(
        Math.max(Number(index) || 0, 0) * DOCK_STAGGER_TIMINGS.STANDARD,
        0.4,
      ),
    },
  }),
  exit: {
    ...staggerItemVariants.exit,
    transition: {
      ...DOCK_TEXT_EXIT_TRANSITION,
    },
  },
});

export const dockFadeVariants = Object.freeze({
  hidden: {
    opacity: 0,
    filter: "blur(4px)",
    transform: toGpuTransform(12, 0.98),
  },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    transform: toGpuTransform(0),
    transition: DOCK_TEXT_ENTER_TRANSITION,
  },
  exit: {
    opacity: 0,
    filter: "blur(4px)",
    transform: toGpuTransform(-8, 0.99),
    transition: DOCK_TEXT_EXIT_TRANSITION,
  },
});

export const dockIconVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(0, 0.88),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0, 1),
    transition: {
      duration: 0.2,
      ease: DOCK_EASINGS.SOFT,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(0, 0.88),
    transition: {
      duration: 0.2,
      ease: DOCK_EASINGS.EXIT,
    },
  },
});

export const dockBadgeVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(0, 0.78),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(0, 0.82),
  },
});

export const dockBackdropVariants = Object.freeze({
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
  },
  exit: {
    opacity: 0,
  },
});

export const dockBreadcrumbsVariants = Object.freeze({
  hidden: {
    opacity: 0,
    filter: "blur(4px)",
    transform: toGpuTransform(-10, 0.96),
  },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    transform: toGpuTransform(0),
    transition: DOCK_BREADCRUMBS_TRANSITION,
  },
  exit: {
    opacity: 0,
    filter: "blur(4px)",
    transform: toGpuTransform(-6, 0.98),
    transition: DOCK_BREADCRUMBS_TRANSITION,
  },
});

export const dockHudVariants = Object.freeze({
  hidden: {
    opacity: 0,
    filter: "blur(6px)",
    transform: toGpuTransform(8, 0.985),
  },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    transform: toGpuTransform(0),
    transition: DOCK_HUD_TRANSITION,
  },
  exit: {
    opacity: 0,
    filter: "blur(6px)",
    transform: toGpuTransform(8, 0.985),
    transition: DOCK_HUD_TRANSITION,
  },
});

export const dockCompactTitleVariants = Object.freeze({
  hidden: {
    opacity: 0,
    filter: "blur(4px)",
    transform: toGpuTransform(8, 0.98),
  },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    transform: toGpuTransform(0),
    transition: DOCK_COMPACT_TITLE_ENTER_TRANSITION,
  },
  exit: {
    opacity: 0,
    filter: "blur(4px)",
    transform: toGpuTransform(-6, 0.99),
    transition: DOCK_COMPACT_TITLE_EXIT_TRANSITION,
  },
});

const SOUNDWAVE_FREQUENCY_PROFILES = Object.freeze([
  Object.freeze({
    scaleY: [0.35, 0.85, 0.4, 1.0, 0.35],
    duration: 1.0,
    delay: 0,
    ease: DOCK_EASINGS.SOFT,
  }),

  Object.freeze({
    scaleY: [0.4, 0.65, 1.0, 0.5, 0.4],
    duration: 0.9,
    delay: 0.1,
    ease: DOCK_EASINGS.EMPHASIZED,
  }),

  Object.freeze({
    scaleY: [0.25, 0.95, 0.45, 0.8, 0.25],
    duration: 1.1,
    delay: 0.05,
    ease: DOCK_EASINGS.SOFT,
  }),

  Object.freeze({
    scaleY: [0.3, 0.75, 0.35, 0.9, 0.3],
    duration: 0.8,
    delay: 0.1,
    ease: DOCK_EASINGS.EMPHASIZED,
  }),
]);

export const dockSoundwaveBarVariants = Object.freeze({
  playing: (index: any) => {
    const safeIdx = Math.max(0, Number(index) || 0);
    const profile =
      SOUNDWAVE_FREQUENCY_PROFILES[
        safeIdx % SOUNDWAVE_FREQUENCY_PROFILES.length
      ];
    return {
      transform: profile.scaleY.map((scale) => toGpuTransform(0, scale)),
      transition: {
        duration: profile.duration,
        repeat: Infinity,
        ease: profile.ease,
        delay: profile.delay,
      },
    };
  },
  paused: {
    transform: toGpuTransform(0, 0.3),
    transition: {
      duration: 0.4,
      ease: DOCK_EASINGS.EXIT,
    },
  },
});

export const dockScrubberTooltipVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(8, 0.94),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(6, 0.96),
  },
});

export function getDockDescriptionVariants(targetOpacity = 0.7) {
  return {
    hidden: {
      opacity: 0,
      filter: "blur(4px)",
      transform: toGpuTransform(8, 0.99),
    },
    visible: {
      opacity: targetOpacity,
      filter: "blur(0px)",
      transform: toGpuTransform(0),
      transition: {
        duration: 0.6,
        ease: DOCK_EASINGS.EMPHASIZED,
      },
    },
    exit: {
      opacity: 0,
      filter: "blur(4px)",
      transform: toGpuTransform(-5, 0.99),
      transition: {
        duration: 0.4,
        ease: DOCK_EASINGS.EXIT,
      },
    },
  };
}

export function getDockActionStaggerTransition(index = 0) {
  return {
    ...DOCK_STAGGER_TRANSITION,
    delay: Math.min(Math.max(Number(index) || 0, 0) * DOCK_STAGGER_DELAY, 0.42),
  };
}

export function getDockActionMotionProps({
  disabled = false,
  reduceMotion = false,
}: {
  disabled?: boolean;
  reduceMotion?: boolean;
} = {}) {
  const canMove = !disabled && !reduceMotion;
  return {
    initial: false as const,
    animate: "idle",
    whileTap: canMove ? "tap" : undefined,
    variants: dockActionVariants,
    transition: DOCK_BUTTON_TRANSITION,
  };
}

export function getDockMediaVolumeFillTransition({
  isDragging = false,
}: { isDragging?: boolean } = {}) {
  return isDragging ? "none" : DOCK_MEDIA_VOLUME_FILL_TRANSITION;
}

export function getDockMediaVolumeThumbAnimateProps({
  isDragging = false,
}: {
  isDragging?: boolean;
} = {}) {
  return isDragging
    ? dockMediaVolumeThumbVariants.dragging
    : dockMediaVolumeThumbVariants.idle;
}

export function getDockMediaVolumeThumbPositionTransition({
  isDragging = false,
}: {
  isDragging?: boolean;
} = {}) {
  return isDragging ? "none" : DOCK_MEDIA_VOLUME_THUMB_POSITION_TRANSITION;
}

export function getDockStackAnimateProps({
  width,
  height,
  isBreadcrumbsVisible = false,
  isFullscreen = false,
}: {
  width: any;
  height: any;
  isBreadcrumbsVisible?: boolean;
  isExtensionsVisible?: boolean;
  isFullscreen?: boolean;
}) {
  const safeWidth = Number(width);
  const safeHeight = Number(height);
  const liftAmount = isBreadcrumbsVisible ? -44 : 0;
  return {
    width: Math.max(0, Math.round(Number.isFinite(safeWidth) ? safeWidth : 0)),
    height: Math.max(
      0,
      Math.round(Number.isFinite(safeHeight) ? safeHeight : 0),
    ),
    transform: toGpuTransform(liftAmount),
    opacity: isFullscreen ? 0 : 1,
    pointerEvents: isFullscreen ? ("none" as const) : ("auto" as const),
  };
}

export function getDockCardDelay({
  expanded = false,
  isStackHovered = false,
  position = 0,
}: {
  expanded?: boolean;
  isStackHovered?: boolean;
  position?: number;
} = {}) {
  const safePosition = Math.max(0, Number(position) || 0);
  if (expanded && safePosition > 0) {
    return Math.min(safePosition * DOCK_STAGGER_TIMINGS.EXPAND, 0.4);
  }
  if (isStackHovered && safePosition > 0) {
    return Math.min((safePosition - 1) * DOCK_STAGGER_TIMINGS.PEEK, 0.3);
  }
  return 0;
}

export function getDockItemAnimateValues({
  motionValues,
  expanded = false,
  isStackHovered = false,
  isSurfaceActive = false,
  position = 0,
}: {
  motionValues?: any;
  expanded?: boolean;
  isStackHovered?: boolean;
  isSurfaceActive?: boolean;
  position?: number;
} = {}) {
  if (!motionValues) return {};
  const safePosition = Math.max(0, Number(position) || 0);
  const isHoveredOffset =
    !expanded && isStackHovered && safePosition > 0 && !isSurfaceActive;
  const peekProgress = Math.min(safePosition / 3, 1);
  const peekOffset = DOCK_TIERS.MICRO.distance * (0.85 + peekProgress * 0.35);
  const peekScale = DOCK_TIERS.MICRO.scaleDelta * (1 - peekProgress * 0.25);
  const y = isHoveredOffset
    ? motionValues.y - safePosition * peekOffset
    : motionValues.y;
  const scale = isHoveredOffset
    ? motionValues.scale * (1 + peekScale)
    : motionValues.scale;

  return {
    transform: toGpuTransform(y, scale),
    opacity: motionValues.opacity,
  };
}

export function getDockItemTransition({
  expanded = false,
  isStackHovered = false,
  isRestoringDeck = false,
  isCompactingDeck = false,
  position = 0,
  delay = 0,
}: {
  expanded?: boolean;
  isStackHovered?: boolean;
  isRestoringDeck?: boolean;
  isCompactingDeck?: boolean;
  position?: number;
  delay?: number;
} = {}) {
  const safePosition = Math.max(0, Number(position) || 0);
  if (isCompactingDeck && safePosition > 0) {
    return {
      ...DOCK_COMPACT_CONTENT_TRANSITION,
      delay: 0,
    };
  }
  const baseTransition = isRestoringDeck
    ? DOCK_COMPACT_RESTORE_TRANSITION
    : !expanded && isStackHovered && safePosition > 0
      ? DOCK_PEEK_TRANSITION
      : DOCK_CARD_TRANSITION;
  return {
    ...baseTransition,
    delay:
      (Number(delay) || 0) +
      (isRestoringDeck && safePosition > 0
        ? 0.2 + Math.min(safePosition * 0.05, 0.1)
        : 0),
  };
}

export function getPrefersReducedMotion(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const DOCK_REDUCED_MOTION_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.2,
  ease: "easeInOut" as const,
});

export function getDockItemCompactRestoreValues({
  motionValues,
  position = 0,
}: {
  motionValues?: any;
  position?: number;
} = {}) {
  if (!motionValues) return {};
  const safePosition = Math.max(0, Number(position) || 0);
  if (safePosition === 0)
    return getDockItemAnimateValues({
      motionValues,
    });
  return {
    opacity: 0,
    transform: toGpuTransform(0, 0.975 - Math.min(safePosition * 0.006, 0.018)),
  };
}

export function getDockItemCompactExitValues({
  motionValues,
  position = 0,
}: {
  motionValues?: any;
  position?: number;
} = {}) {
  const safePosition = Math.max(0, Number(position) || 0);
  const targetY =
    motionValues && Number.isFinite(motionValues.y)
      ? motionValues.y
      : safePosition * DOCK_CARD_DIMENSIONS.collapsedY;
  const targetScale =
    motionValues && Number.isFinite(motionValues.scale)
      ? motionValues.scale * 0.98
      : 0.98 - Math.min(safePosition * 0.008, 0.024);

  return {
    opacity: 0,
    transform: toGpuTransform(targetY, targetScale),
    transition: {
      ...DOCK_CARD_COLLAPSE_TRANSITION,
      delay: Math.min(
        Math.max(2 - safePosition, 0) * DOCK_STAGGER_TIMINGS.COLLAPSE,
        0.1,
      ),
    },
  };
}

export function getDockCardContentAnimateProps({
  compact = false,
  expanded = false,
  position = 0,
  isExtensionShelf = false,
}: {
  compact?: boolean;
  expanded?: boolean;
  position?: number;
  isExtensionShelf?: boolean;
} = {}) {
  const isHidden = compact || (!expanded && position > 0 && !isExtensionShelf);
  return {
    opacity: isHidden ? 0 : 1,
    transform: toGpuTransform(
      isHidden ? DOCK_TIERS.STANDARD.distance * 0.35 : 0,
      isHidden ? 1 - DOCK_TIERS.MICRO.scaleDelta : 1,
    ),
  };
}

export function getDockCardContentTransition({
  compact = false,
  isRestoringFromCompact = false,
}: {
  compact?: boolean;
  isRestoringFromCompact?: boolean;
} = {}) {
  if (compact) return DOCK_COMPACT_CONTENT_TRANSITION;
  if (!isRestoringFromCompact) return DOCK_TEXT_ENTER_TRANSITION;
  return {
    ...DOCK_TEXT_ENTER_TRANSITION,
    duration: 0.4,
    delay: 0.1,
  };
}

export function getDockScrollProgressStyle(progress = 0) {
  const safeProgress = Math.min(Math.max(Number(progress) || 0, 0), 1);
  return {
    width: "100%",
    transformOrigin: "left center",
    transform: `scaleX(${safeProgress})`,
  };
}
