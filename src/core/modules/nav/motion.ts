import { NAV_CARD_DIMENSIONS } from "./constants";

export const NAV_EASINGS = Object.freeze({
  APPLE_FLUID: Object.freeze([0.82, 0, 0.18, 1] as const),
  FLUID_RESIZE: Object.freeze([0.32, 0.12, 0.18, 1] as const),
  PROGRESSIVE_EXIT: Object.freeze([0.75, 0, 0.85, 0.2] as const),
  CINEMATIC: Object.freeze([0.76, 0, 0.24, 1] as const),
  EMPHASIZED: Object.freeze([0.16, 1, 0.3, 1] as const),
  SOFT: Object.freeze([0.22, 1, 0.36, 1] as const),
  EXIT: Object.freeze([0.7, 0, 0.84, 0] as const),
} as const);

export const NAV_TIERS = Object.freeze({
  MICRO: Object.freeze({
    duration: 0.24,
    distance: 4,
    scaleDelta: 0.008,
    ease: NAV_EASINGS.EMPHASIZED,
  }),
  FAST: Object.freeze({
    duration: 0.44,
    distance: 9,
    scaleDelta: 0.012,
    ease: NAV_EASINGS.EMPHASIZED,
  }),
  STANDARD: Object.freeze({
    duration: 0.66,
    distance: 18,
    scaleDelta: 0.018,
    ease: NAV_EASINGS.SOFT,
  }),
  SURFACE: Object.freeze({
    duration: 0.96,
    distance: 28,
    scaleDelta: 0.024,
    ease: NAV_EASINGS.CINEMATIC,
  }),
} as const);

export const NAV_SPRINGS = Object.freeze({
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

export const NAV_STAGGER_TIMINGS = Object.freeze({
  EXPAND: 0.068,
  COLLAPSE: 0.052,
  PEEK: 0.078,
  STANDARD: 0.06,
  FAST: 0.042,
} as const);

export const NAV_STAGGER_DELAY = NAV_STAGGER_TIMINGS.STANDARD;

export const NAV_SURFACE_CHOREOGRAPHY_TIMINGS = Object.freeze({
  ACTION_DISMISS_MS: 260,
  ACTION_DISMISS_SETTLE_MS: 100,
  HEADER_SWAP_MS: 0,
  HEADER_SWAP_SETTLE_MS: 0,
  BODY_ENTER_MS: 840,
  BODY_EXIT_MS: 320,
  BODY_COLLAPSE_SETTLE_MS: 0,
  HEADER_RESTORE_MS: 520,
  RESTORE_SETTLE_MS: 0,
} as const);

export const NAV_COMPACT_RESTORE_DURATION_MS = 400;
export const NAV_COMPACT_TO_EXPAND_DELAY_MS = NAV_COMPACT_RESTORE_DURATION_MS;
export const NAV_COMPACT_TO_SURFACE_DELAY_MS = 380;
export const NAV_SURFACE_HEADER_REVEAL_DELAY_MS = 220;
export const NAV_SURFACE_EXIT_SETTLE_MS = 520;
export const NAV_SURFACE_CLOSE_TO_COMPACT_DELAY_MS = 520;
export const NAV_TAP_SCALE = 0.96;

export const NAV_SURFACE_DRAG_CONSTRAINTS = Object.freeze({
  top: 0,
  bottom: 0,
} as const);

export const NAV_SURFACE_DRAG_ELASTIC = Object.freeze({
  top: 0.05,
  bottom: 0.5,
} as const);

export const NAV_SURFACE_DRAG_THRESHOLDS = Object.freeze({
  DISMISS_OFFSET_Y: 65,
  DISMISS_VELOCITY_Y: 400,
} as const);

export const NAV_SURFACE_DRAG_INTERPOLATION = Object.freeze({
  DRAG_RANGE: Object.freeze([0, 180] as const),
  OPACITY_RANGE: Object.freeze([1, 0.75] as const),
  SCALE_RANGE: Object.freeze([1, 0.96] as const),
} as const);

export const NAV_SURFACE_DRAG = Object.freeze({
  CONSTRAINTS: NAV_SURFACE_DRAG_CONSTRAINTS,
  ELASTIC: NAV_SURFACE_DRAG_ELASTIC,
  THRESHOLDS: NAV_SURFACE_DRAG_THRESHOLDS,
  INTERPOLATION: NAV_SURFACE_DRAG_INTERPOLATION,
} as const);

export const NAV_COMPOSITOR_STYLE = Object.freeze({
  WebkitBackfaceVisibility: "hidden",
  backfaceVisibility: "hidden",
  WebkitFontSmoothing: "antialiased",
  transform: "translateZ(0)",
} as const);

export const NAV_STACK_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: NAV_TIERS.STANDARD.duration,
  ease: NAV_EASINGS.SOFT,
});

export const NAV_COMPACT_STACK_ENTER_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.38,
  ease: NAV_EASINGS.APPLE_FLUID,
});

export const NAV_COMPACT_STACK_EXIT_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.4,
  ease: NAV_EASINGS.APPLE_FLUID,
});

export const NAV_CARD_HEIGHT_OPEN_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.84,
  ease: NAV_EASINGS.APPLE_FLUID,
});

export const NAV_CARD_HEIGHT_CLOSE_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.84,
  ease: NAV_EASINGS.APPLE_FLUID,
});

export const NAV_CARD_EXPAND_TRANSITION = NAV_CARD_HEIGHT_OPEN_TRANSITION;

export const NAV_SURFACE_BODY_ENTER_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.84,
  ease: NAV_EASINGS.APPLE_FLUID,
});

export const NAV_SURFACE_BODY_EXIT_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.32,
  ease: NAV_EASINGS.APPLE_FLUID,
});

export const NAV_SURFACE_RESIZE_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.58,
  ease: NAV_EASINGS.FLUID_RESIZE,
  height: {
    type: "tween" as const,
    duration: 0.58,
    ease: NAV_EASINGS.FLUID_RESIZE,
  },
  width: {
    type: "tween" as const,
    duration: 0.58,
    ease: NAV_EASINGS.FLUID_RESIZE,
  },
});

export const NAV_SURFACE_BODY_STEP_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.54,
  ease: NAV_EASINGS.FLUID_RESIZE,
});

export const NAV_SURFACE_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: NAV_TIERS.SURFACE.duration,
  ease: NAV_EASINGS.APPLE_FLUID,
});

export const NAV_ACTION_DISMISS_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.26,
  ease: NAV_EASINGS.EXIT,
});

export const NAV_HEADER_SWAP_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.52,
  ease: NAV_EASINGS.APPLE_FLUID,
});

export const NAV_SURFACE_CONTROLS_CONTAINER_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.44,
  ease: NAV_EASINGS.APPLE_FLUID,
});

export const NAV_SURFACE_CONTROLS_ITEM_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.32,
  ease: NAV_EASINGS.APPLE_FLUID,
});

export const NAV_SURFACE_CONTROLS_ACTION_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.28,
  ease: NAV_EASINGS.APPLE_FLUID,
});

export const NAV_SURFACE_EXTENSIONS_ENTER_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.54,
  ease: NAV_EASINGS.CINEMATIC,
});

export const NAV_SURFACE_EXTENSIONS_EXIT_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.38,
  ease: NAV_EASINGS.EXIT,
});

export const NAV_CARD_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: NAV_TIERS.STANDARD.duration,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_CARD_COLLAPSE_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.62,
  ease: NAV_EASINGS.EXIT,
});

export const NAV_PEEK_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.38,
  ease: NAV_EASINGS.SOFT,
});

export const NAV_COMPACT_CONTENT_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.16,
  ease: NAV_EASINGS.EXIT,
});

export const NAV_COMPACT_RESTORE_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.36,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_CARD_SPRING = NAV_SPRINGS.DECK;
export const NAV_PEEK_SPRING = NAV_SPRINGS.PEEK;

export const NAV_BACKDROP_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.84,
  ease: NAV_EASINGS.APPLE_FLUID,
});

export const NAV_BACKDROP_EXPAND_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.66,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_BACKDROP_COLLAPSE_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.52,
  ease: NAV_EASINGS.EXIT,
});

export function getNavBackdropTransition({
  expanded = false,
  isSurface = false,
}: {
  expanded?: boolean;
  isSurface?: boolean;
} = {}) {
  if (isSurface) {
    return NAV_BACKDROP_TRANSITION;
  }
  if (expanded) {
    return NAV_BACKDROP_EXPAND_TRANSITION;
  }
  return NAV_BACKDROP_COLLAPSE_TRANSITION;
}

export const NAV_FADE_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: NAV_TIERS.STANDARD.duration,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_TEXT_ENTER_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.62,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_TEXT_EXIT_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.38,
  ease: NAV_EASINGS.EXIT,
});

export const NAV_ICON_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.48,
  ease: NAV_EASINGS.SOFT,
});

export const NAV_BREADCRUMBS_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.57,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_HUD_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.66,
  ease: NAV_EASINGS.CINEMATIC,
});

export const NAV_COMPACT_TITLE_ENTER_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.2,
  delay: 0.16,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_COMPACT_TITLE_EXIT_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.14,
  ease: NAV_EASINGS.EXIT,
});

export const NAV_STAGGER_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.62,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_MICRO_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: NAV_TIERS.MICRO.duration,
  ease: NAV_TIERS.MICRO.ease,
});

export const NAV_ACTIVE_INDICATOR_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.48,
  ease: NAV_EASINGS.SOFT,
});

export const NAV_RESULTS_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.79,
  ease: NAV_EASINGS.CINEMATIC,
});

export const NAV_RESULTS_EXIT_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.48,
  ease: NAV_EASINGS.EXIT,
});

export const NAV_RESULTS_STAGGER_DELAY = NAV_STAGGER_TIMINGS.STANDARD;

export const NAV_BUTTON_TRANSITION = NAV_SPRINGS.PRESS;
export const NAV_BADGE_TRANSITION = NAV_SPRINGS.BADGE;

export const NAV_SCRUBBER_TOOLTIP_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.31,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_SCRUBBER_TOOLTIP_SPRING = NAV_SPRINGS.SCRUBBER_TOOLTIP;

export const NAV_MEDIA_VOLUME_FILL_TRANSITION =
  "width 240ms cubic-bezier(0.16, 1, 0.3, 1)";
export const NAV_MEDIA_VOLUME_THUMB_POSITION_TRANSITION =
  "left 240ms cubic-bezier(0.16, 1, 0.3, 1)";

export const NAV_SKELETON_PULSE_CLASS = "animate-pulse";

export function toGpuTransform(y: any = 0, scale: any = 1): string {
  const safeY = Number.parseFloat(y);
  const safeScale = Number.parseFloat(scale);
  const roundedY = Number.isFinite(safeY) ? Math.round(safeY) : 0;
  const roundedScale = Number.isFinite(safeScale)
    ? Math.round(safeScale * 1000) / 1000
    : 1;
  return `translate3d(0, ${roundedY}px, 0) scale(${roundedScale})`;
}

export const navSurfaceDragTransformTemplate = ({
  y,
  scale,
}: {
  y: any;
  scale: any;
}) => toGpuTransform(y, scale);

export const navActionVariants = Object.freeze({
  idle: {
    transform: toGpuTransform(0, 1),
  },
  hover: {
    transform: toGpuTransform(0, 1),
  },
  tap: {
    transform: toGpuTransform(0, NAV_TAP_SCALE),
  },
});

export const navMediaVolumeThumbVariants = Object.freeze({
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
  tierName: keyof typeof NAV_TIERS,
  { distanceScale = 0 }: { distanceScale?: number } = {},
) {
  const tier = NAV_TIERS[tierName];
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
      duration: tier.duration * 0.72,
      ease: NAV_EASINGS.EXIT,
    },
  };
  if (distance) {
    hidden.transform = toGpuTransform(distance, 1 - tier.scaleDelta);
    visible.transform = toGpuTransform(0);
    exit.transform = toGpuTransform(
      Math.round(distance * 0.72),
      1 - tier.scaleDelta * 0.6,
    );
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

export const navHeaderSwapVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(16, 0.98),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    transition: {
      duration: 0.64,
      ease: NAV_EASINGS.APPLE_FLUID,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-12, 0.97),
    transition: {
      duration: 0.54,
      ease: NAV_EASINGS.APPLE_FLUID,
    },
  },
});

export const navExtensionShelfVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(6, 0.99),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0, 1),
    transition: {
      duration: 0.44,
      ease: NAV_EASINGS.CINEMATIC,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-6, 0.99),
    transition: {
      duration: 0.32,
      ease: NAV_EASINGS.EXIT,
    },
  },
});

export const navHeaderRestoreVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(-16, 0.98),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    transition: {
      duration: 0.52,
      ease: NAV_EASINGS.APPLE_FLUID,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(14, 0.97),
    transition: {
      duration: 0.54,
      ease: NAV_EASINGS.APPLE_FLUID,
    },
  },
});

export const navSurfaceControlsContainerVariants = Object.freeze({
  hidden: (targetY: any = 0) => ({
    opacity: 0,
    y: (Number(targetY) || 0) + 6,
    transition: {
      duration: 0.32,
      ease: NAV_EASINGS.EXIT,
    },
  }),
  visible: (targetY: any = 0) => ({
    opacity: 1,
    y: Number(targetY) || 0,
    transition: NAV_SURFACE_CONTROLS_CONTAINER_TRANSITION,
  }),
  exit: (targetY: any = 0) => ({
    opacity: 0,
    y: (Number(targetY) || 0) + 6,
    transition: {
      duration: 0.32,
      ease: NAV_EASINGS.EXIT,
    },
  }),
});

export const navSurfaceControlsActionVariants = Object.freeze({
  hidden: {
    opacity: 0,
    scale: 0.92,
    x: 4,
  },
  visible: {
    opacity: 1,
    scale: 1,
    x: 0,
    transition: NAV_SURFACE_CONTROLS_ACTION_TRANSITION,
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    x: 4,
    transition: {
      duration: 0.24,
      ease: NAV_EASINGS.PROGRESSIVE_EXIT,
    },
  },
});

export const navSurfaceControlsBackVariants = Object.freeze({
  hidden: {
    opacity: 0,
    scale: 0.85,
    x: 4,
  },
  visible: {
    opacity: 1,
    scale: 1,
    x: 0,
    transition: NAV_SURFACE_CONTROLS_ITEM_TRANSITION,
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    x: 4,
    transition: {
      duration: 0.24,
      ease: NAV_EASINGS.PROGRESSIVE_EXIT,
    },
  },
});

export const navSurfaceControlsCloseVariants = Object.freeze({
  hidden: {
    opacity: 0,
    scale: 0.85,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: NAV_SURFACE_CONTROLS_ITEM_TRANSITION,
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    transition: {
      duration: 0.24,
      ease: NAV_EASINGS.PROGRESSIVE_EXIT,
    },
  },
});

export const navSurfaceControlsVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: "translate3d(0px, 14px, 0) scale(0.92)",
  },
  visible: (customIndex: any = 0) => ({
    opacity: 1,
    transform: "translate3d(0px, 0px, 0) scale(1)",
    transition: {
      duration: 0.64,
      delay: (Number(customIndex) || 0) * 0.04,
      ease: NAV_EASINGS.CINEMATIC,
    },
  }),
  exit: {
    opacity: 0,
    transform: "translate3d(0px, 10px, 0) scale(0.95)",
    transition: {
      duration: 0.44,
      ease: NAV_EASINGS.CINEMATIC,
    },
  },
});

export const navCommandBarSwapVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: "translate3d(12px, 0, 0) scale(0.88)",
  },
  visible: (customIndex: any = 0) => ({
    opacity: 1,
    transform: "translate3d(0px, 0, 0) scale(1)",
    transition: {
      duration: 0.44,
      delay: (Number(customIndex) || 0) * 0.04 + 0.06,
      ease: NAV_EASINGS.CINEMATIC,
    },
  }),
  exit: (customIndex: any = 0) => ({
    opacity: 0,
    transform: "translate3d(12px, 0, 0) scale(0.85)",
    transition: {
      duration: 0.32,
      delay: (Number(customIndex) || 0) * 0.02,
      ease: NAV_EASINGS.EXIT,
    },
  }),
});

export const navSurfaceBodyVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(20, 0.98),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(24, 0.98),
    transition: {
      duration: 0.32,
      ease: NAV_EASINGS.APPLE_FLUID,
    },
  },
});

export const navSurfaceExtensionsVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(-18, 0.85),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(-28, 0.85),
    transition: {
      duration: 0.54,
      ease: NAV_EASINGS.CINEMATIC,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-18, 0.85),
    transition: {
      duration: 0.38,
      ease: NAV_EASINGS.EXIT,
    },
  },
});

export const navActionDismissVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(10, 0.98),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    transition: {
      duration: 0.26,
      ease: NAV_EASINGS.SOFT,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-8, 0.98),
    transition: {
      duration: 0.26,
      ease: NAV_EASINGS.EXIT,
    },
  },
});

export const navListItemVariants = Object.freeze({
  hidden: staggerItemVariants.hidden,
  visible: (index: any = 0) => ({
    ...staggerItemVariants.visible,
    transition: {
      ...NAV_STAGGER_TRANSITION,
      delay: Math.min(
        Math.max(Number(index) || 0, 0) * NAV_STAGGER_TIMINGS.STANDARD,
        0.42,
      ),
    },
  }),
  exit: {
    ...staggerItemVariants.exit,
    transition: {
      ...NAV_TEXT_EXIT_TRANSITION,
    },
  },
});

export const navFadeVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(12, 0.98),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    transition: NAV_TEXT_ENTER_TRANSITION,
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-8, 0.99),
    transition: NAV_TEXT_EXIT_TRANSITION,
  },
});

export const navIconVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(0, 0.88),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0, 1),
    transition: {
      duration: 0.22,
      ease: NAV_EASINGS.SOFT,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(0, 0.88),
    transition: {
      duration: 0.16,
      ease: NAV_EASINGS.EXIT,
    },
  },
});

export const navBadgeVariants = Object.freeze({
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

export const navBackdropVariants = Object.freeze({
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

export const navBreadcrumbsVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(-10, 0.96),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-6, 0.98),
  },
});

export const navHudVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(14, 0.975),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    transition: NAV_HUD_TRANSITION,
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-6, 0.99),
    transition: NAV_TEXT_EXIT_TRANSITION,
  },
});

export const navCompactTitleVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(8, 0.98),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    transition: NAV_COMPACT_TITLE_ENTER_TRANSITION,
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-6, 0.99),
    transition: NAV_COMPACT_TITLE_EXIT_TRANSITION,
  },
});

const SOUNDWAVE_FREQUENCY_PROFILES = Object.freeze([
  Object.freeze({
    scaleY: [0.35, 0.85, 0.4, 1.0, 0.35],
    duration: 1.05,
    delay: 0,
    ease: NAV_EASINGS.SOFT,
  }),

  Object.freeze({
    scaleY: [0.4, 0.65, 1.0, 0.5, 0.4],
    duration: 0.92,
    delay: 0.08,
    ease: NAV_EASINGS.EMPHASIZED,
  }),

  Object.freeze({
    scaleY: [0.25, 0.95, 0.45, 0.8, 0.25],
    duration: 1.15,
    delay: 0.04,
    ease: NAV_EASINGS.SOFT,
  }),

  Object.freeze({
    scaleY: [0.3, 0.75, 0.35, 0.9, 0.3],
    duration: 0.85,
    delay: 0.12,
    ease: NAV_EASINGS.EMPHASIZED,
  }),
]);

export const navSoundwaveBarVariants = Object.freeze({
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
      duration: 0.44,
      ease: NAV_EASINGS.EXIT,
    },
  },
});

export const navScrubberTooltipVariants = Object.freeze({
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

export function getNavDescriptionVariants(targetOpacity = 0.7) {
  return {
    hidden: {
      opacity: 0,
      transform: toGpuTransform(8, 0.99),
    },
    visible: {
      opacity: targetOpacity,
      transform: toGpuTransform(0),
      transition: {
        duration: 0.62,
        ease: NAV_EASINGS.EMPHASIZED,
      },
    },
    exit: {
      opacity: 0,
      transform: toGpuTransform(-5, 0.99),
      transition: {
        duration: 0.38,
        ease: NAV_EASINGS.EXIT,
      },
    },
  };
}

export function getNavActionStaggerTransition(index = 0) {
  return {
    ...NAV_STAGGER_TRANSITION,
    delay: Math.min(Math.max(Number(index) || 0, 0) * NAV_STAGGER_DELAY, 0.42),
  };
}

export function getNavActionMotionProps({
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
    variants: navActionVariants,
    transition: NAV_BUTTON_TRANSITION,
  };
}

export function getNavMediaVolumeFillTransition({
  isDragging = false,
}: { isDragging?: boolean } = {}) {
  return isDragging ? "none" : NAV_MEDIA_VOLUME_FILL_TRANSITION;
}

export function getNavMediaVolumeThumbAnimateProps({
  isDragging = false,
}: {
  isDragging?: boolean;
} = {}) {
  return isDragging
    ? navMediaVolumeThumbVariants.dragging
    : navMediaVolumeThumbVariants.idle;
}

export function getNavMediaVolumeThumbPositionTransition({
  isDragging = false,
}: {
  isDragging?: boolean;
} = {}) {
  return isDragging ? "none" : NAV_MEDIA_VOLUME_THUMB_POSITION_TRANSITION;
}

export function getNavStackAnimateProps({
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
  const liftAmount = isBreadcrumbsVisible ? -42 : 0;
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

export function getNavCardDelay({
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
    return Math.min(safePosition * NAV_STAGGER_TIMINGS.EXPAND, 0.42);
  }
  if (isStackHovered && safePosition > 0) {
    return Math.min((safePosition - 1) * NAV_STAGGER_TIMINGS.PEEK, 0.32);
  }
  return 0;
}

export function getNavItemAnimateValues({
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
  const peekOffset = NAV_TIERS.MICRO.distance * (0.85 + peekProgress * 0.35);
  const peekScale = NAV_TIERS.MICRO.scaleDelta * (1 - peekProgress * 0.25);
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

export function getNavItemTransition({
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
      ...NAV_COMPACT_CONTENT_TRANSITION,
      delay: 0,
    };
  }
  const baseTransition = isRestoringDeck
    ? NAV_COMPACT_RESTORE_TRANSITION
    : !expanded && isStackHovered && safePosition > 0
      ? NAV_PEEK_TRANSITION
      : NAV_CARD_TRANSITION;
  return {
    ...baseTransition,
    delay:
      (Number(delay) || 0) +
      (isRestoringDeck && safePosition > 0
        ? 0.18 + Math.min(safePosition * 0.04, 0.12)
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

export const NAV_REDUCED_MOTION_TRANSITION = Object.freeze({
  type: "tween" as const,
  duration: 0.2,
  ease: "easeInOut" as const,
});

export function getNavItemCompactRestoreValues({
  motionValues,
  position = 0,
}: {
  motionValues?: any;
  position?: number;
} = {}) {
  if (!motionValues) return {};
  const safePosition = Math.max(0, Number(position) || 0);
  if (safePosition === 0)
    return getNavItemAnimateValues({
      motionValues,
    });
  return {
    opacity: 0,
    transform: toGpuTransform(0, 0.975 - Math.min(safePosition * 0.006, 0.018)),
  };
}

export function getNavItemCompactExitValues({
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
      : safePosition * NAV_CARD_DIMENSIONS.collapsedY;
  const targetScale =
    motionValues && Number.isFinite(motionValues.scale)
      ? motionValues.scale * 0.98
      : 0.98 - Math.min(safePosition * 0.008, 0.024);

  return {
    opacity: 0,
    transform: toGpuTransform(targetY, targetScale),
    transition: {
      ...NAV_CARD_COLLAPSE_TRANSITION,
      delay: Math.min(
        Math.max(2 - safePosition, 0) * NAV_STAGGER_TIMINGS.COLLAPSE,
        0.08,
      ),
    },
  };
}

export function getNavCardContentAnimateProps({
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
      isHidden ? NAV_TIERS.STANDARD.distance * 0.35 : 0,
      isHidden ? 1 - NAV_TIERS.MICRO.scaleDelta : 1,
    ),
  };
}

export function getNavCardContentTransition({
  compact = false,
  isRestoringFromCompact = false,
}: {
  compact?: boolean;
  isRestoringFromCompact?: boolean;
} = {}) {
  if (compact) return NAV_COMPACT_CONTENT_TRANSITION;
  if (!isRestoringFromCompact) return NAV_TEXT_ENTER_TRANSITION;
  return {
    ...NAV_TEXT_ENTER_TRANSITION,
    duration: 0.36,
    delay: 0.16,
  };
}

export function getNavScrollProgressStyle(progress = 0) {
  const safeProgress = Math.min(Math.max(Number(progress) || 0, 0), 1);
  return {
    width: "100%",
    transformOrigin: "left center",
    transform: `scaleX(${safeProgress})`,
  };
}
