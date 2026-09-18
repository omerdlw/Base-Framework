"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { cn } from "@/core/utils";
import { useIsomorphicLayoutEffect } from "@/core/hooks";
import { canUseBottomLock, getDistanceToBottom } from "./behavior";
import { isSamePath, isInlineActionPathMatch } from "./routing";

import {
  COMPACT_CARD_HORIZONTAL_PADDING,
  COMPACT_CARD_MAX_OFFSET,
  COMPACT_CARD_MIN_WIDTH,
  NAV_STYLE_SECTIONS,
  HEIGHT_EPSILON,
  NAV_CARD_LAYOUT,
  NAV_HEIGHT_BUFFER,
  NAV_SPACER_BOTTOM_LOCK_DISTANCE,
  NAV_SURFACE_PHASE,
  VIEWPORT_MARGIN,
} from "./constants";
import {
  clamp,
  getImageIconStyle,
  getItemKey,
  getItemMeasurementKey,
  getLineClampStyle,
  getRouteMeasurementKey,
  splitStyle,
  toObject,
} from "./utils";
import type { NavItem } from "./types";

export {
  getImageIconStyle,
  getItemKey,
  getItemMeasurementKey,
  getLineClampStyle,
  getRouteMeasurementKey,
  splitStyle,
};

export interface NavItemCardPropsOptions {
  cardScale?: number;
  cardStyle?: Record<string, any>;
  expanded?: boolean;
  hasExtensions?: boolean;
  isAnchoredToBottom?: boolean;
  position: number;
  visibleCount?: number;
}

export function getNavItemCardProps({
  cardScale,
  cardStyle,
  expanded,
  hasExtensions = false,
  isAnchoredToBottom,
  position,
  visibleCount = 3,
}: NavItemCardPropsOptions) {
  const { offsetY: collapsedOffsetY, scale: collapsedScale } =
    NAV_CARD_LAYOUT.collapsed;
  const { offsetY: expandedOffsetY } = NAV_CARD_LAYOUT.expanded;

  const safeCardStyle = { ...cardStyle };
  delete safeCardStyle.scale;
  delete safeCardStyle.className;

  const isTop = position === 0;
  const isShelf = !expanded && position === 1 && hasExtensions;
  const isHeavyBlur = isTop || expanded || isShelf;
  const collapsedScaleValue = collapsedScale ** position;

  const y = expanded
    ? position * expandedOffsetY
    : isShelf
      ? NAV_CARD_LAYOUT.extensionShelfY
      : position * collapsedOffsetY;
  const shelfScale = NAV_CARD_LAYOUT.extensionShelfScale ?? 0.94;
  const scale = expanded
    ? cardScale || 1
    : isShelf
      ? shelfScale
      : collapsedScaleValue;

  const collapsedOpacity = Math.max(0.1, +(1 - position * 0.2).toFixed(2));
  const opacity =
    expanded || isShelf ? 1 : position < visibleCount ? collapsedOpacity : 0;

  return {
    className: cn(
      "group @container absolute h-auto w-full ring-1 ring-inset ring-white/10 bg-black/50 rounded-[30px] will-change-[transform,opacity] transition-colors duration-500",
      isShelf ? "px-2.5 py-0" : "p-2.5",
      isHeavyBlur ? "backdrop-blur-lg" : "backdrop-blur-sm",
      isTop ? "inset-0 h-full" : isAnchoredToBottom ? "bottom-0" : "top-0",
      isAnchoredToBottom ? "cursor-default" : "cursor-pointer",
      cardStyle?.className,
    ),
    style: {
      ...safeCardStyle,
      overflow: "hidden",
      transformOrigin: isTop
        ? "center center"
        : isAnchoredToBottom
          ? "bottom center"
          : "top center",
      zIndex: 10 - position,
      WebkitPerspective: 1000,
      perspective: 1000,
      WebkitBackfaceVisibility: "hidden" as const,
      backfaceVisibility: "hidden" as const,
      WebkitFontSmoothing: "antialiased",
      transform: "translateZ(0)",
      ...(isTop ? { height: "100%" } : {}),
      pointerEvents: (expanded || position < visibleCount
        ? undefined
        : "none") as any,
    },
    motionValues: { y, scale, opacity },
  };
}

function getViewportMaxHeight(): number {
  if (typeof window === "undefined") return Infinity;
  return window.innerHeight - VIEWPORT_MARGIN;
}

export interface ContainerHeightOptions {
  cardContentHeight?: number | string | null;
  compact?: boolean;
  isHud?: boolean;
}

export function getContainerHeight({
  cardContentHeight,
  compact,
  isHud = false,
}: ContainerHeightOptions): number {
  const chromeHeight = NAV_CARD_LAYOUT.chromeHeight;
  const minCardHeight = compact
    ? NAV_CARD_LAYOUT.compactHeight
    : isHud
      ? NAV_CARD_LAYOUT.hudHeight
      : NAV_CARD_LAYOUT.baseHeight;
  const numericContentHeight = Number(cardContentHeight);

  const nextCardHeight = Math.max(
    minCardHeight,
    (Number.isFinite(numericContentHeight) ? numericContentHeight : 0) +
      chromeHeight,
  );
  return Math.min(nextCardHeight, getViewportMaxHeight());
}

function getNavCardWidth({
  width,
  expandHorizontal,
}: {
  width?: number | string | null;
  expandHorizontal?: boolean;
} = {}): number {
  if (typeof window === "undefined") return width ? Number(width) || 460 : 460;

  const windowWidth = window.innerWidth;
  const isDesktop = windowWidth >= 640;
  const targetWidth = Number(width);

  if (Number.isFinite(targetWidth) && targetWidth > 0) {
    return Math.min(
      targetWidth,
      Math.max(windowWidth - (isDesktop ? 32 : 16), 0),
    );
  }

  if (isDesktop && expandHorizontal) {
    return Math.min(640, Math.max(windowWidth - 32, 0));
  }
  return Math.min(460, Math.max(windowWidth - 16, 0));
}

function getObservedHeight(entry: any, element: HTMLElement | null): number {
  const borderBoxSize = Array.isArray(entry?.borderBoxSize)
    ? entry.borderBoxSize[0]
    : entry?.borderBoxSize;
  if (borderBoxSize?.blockSize != null)
    return Math.round(borderBoxSize.blockSize);
  if (entry?.contentRect?.height != null)
    return Math.round(entry.contentRect.height);
  return Math.round(element?.offsetHeight || 0);
}

function hasMeaningfulHeightChange(
  previousHeight: number,
  nextHeight: number,
): boolean {
  return (
    Math.abs(Math.round(nextHeight) - Math.round(previousHeight)) >
    HEIGHT_EPSILON
  );
}

export function useElementHeight(
  onHeightChange?: ((height: number) => void) | null,
  elementRef?: RefObject<HTMLElement | null>,
  shouldMeasure?: boolean,
  dependencyKey: any = null,
) {
  const lastHeightRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const callbackRef = useRef(onHeightChange);

  useIsomorphicLayoutEffect(() => {
    callbackRef.current = onHeightChange;
  }, [onHeightChange]);

  useIsomorphicLayoutEffect(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastHeightRef.current = -1;

    if (!callbackRef.current) return;
    if (!shouldMeasure) {
      if (hasMeaningfulHeightChange(lastHeightRef.current, 0)) {
        lastHeightRef.current = 0;
        callbackRef.current(0);
      }
      return;
    }

    const element = elementRef?.current;
    if (!element) return;

    function publishHeight(nextHeight: number) {
      if (!hasMeaningfulHeightChange(lastHeightRef.current, nextHeight)) return;
      lastHeightRef.current = nextHeight;
      callbackRef.current?.(nextHeight);
    }

    let pendingHeight: number | null = null;
    function flushPendingHeight() {
      rafRef.current = null;
      if (pendingHeight == null) return;
      const heightToPublish = pendingHeight;
      pendingHeight = null;
      publishHeight(heightToPublish);
    }

    function scheduleMeasurement(nextHeight: number) {
      pendingHeight = nextHeight;
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(flushPendingHeight);
    }

    publishHeight(element.offsetHeight || 0);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        scheduleMeasurement(getObservedHeight(entry, element));
      }
    });
    observer.observe(element);

    const mutationObserver = new MutationObserver(() =>
      scheduleMeasurement(element.offsetHeight || 0),
    );
    mutationObserver.observe(element, { childList: true, subtree: true });

    const handlePageShow = () => scheduleMeasurement(element.offsetHeight || 0);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") handlePageShow();
    };

    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [dependencyKey, elementRef, shouldMeasure]);
}

export interface UseNavHeightControllerOptions {
  compact?: boolean;
  contentKey?: any;
  isHud?: boolean;
  setNavHeight: (height: number) => void;
  surfacePhase?: string;
}

export function useNavHeightController({
  compact,
  contentKey = null,
  isHud = false,
  setNavHeight,
  surfacePhase = NAV_SURFACE_PHASE.IDLE,
}: UseNavHeightControllerOptions) {
  const [containerHeight, setContainerHeight] = useState<number>(
    isHud ? NAV_CARD_LAYOUT.hudHeight : NAV_CARD_LAYOUT.baseHeight,
  );

  const heightRef = useRef<{ content: number }>({ content: 0 });
  const rafRef = useRef<number | null>(null);
  const compactRef = useRef(compact);
  const isHudRef = useRef(isHud);
  const surfacePhaseRef = useRef(surfacePhase);

  const lastAppliedContainerHeightRef = useRef<number>(
    isHud ? NAV_CARD_LAYOUT.hudHeight : NAV_CARD_LAYOUT.baseHeight,
  );
  const lastAppliedSpacerHeightRef = useRef<number>(
    (isHud ? NAV_CARD_LAYOUT.hudHeight : NAV_CARD_LAYOUT.baseHeight) +
      NAV_HEIGHT_BUFFER,
  );

  compactRef.current = compact;
  isHudRef.current = isHud;
  surfacePhaseRef.current = surfacePhase;

  const applyHeight = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const { content } = heightRef.current;
    const currentPhase = surfacePhaseRef.current;
    const isLockedToBaseHeight =
      currentPhase === NAV_SURFACE_PHASE.DISMISSING_ACTION ||
      currentPhase === NAV_SURFACE_PHASE.SWAPPING_HEADER ||
      currentPhase === NAV_SURFACE_PHASE.COLLAPSING_BODY ||
      currentPhase === NAV_SURFACE_PHASE.RESTORING_HEADER;

    const computedContentHeight = isLockedToBaseHeight ? 0 : content;
    const height = getContainerHeight({
      cardContentHeight: computedContentHeight,
      compact: compactRef.current,
      isHud: isHudRef.current,
    });

    const distanceToBottom =
      typeof window !== "undefined" ? getDistanceToBottom() : Infinity;

    const isBottomLockedForSpacer =
      Boolean(compactRef.current) &&
      canUseBottomLock() &&
      distanceToBottom <= NAV_SPACER_BOTTOM_LOCK_DISTANCE;

    const spacerBaseHeight = isBottomLockedForSpacer
      ? NAV_CARD_LAYOUT.compactHeight
      : height;
    const totalSpacerHeight = spacerBaseHeight + NAV_HEIGHT_BUFFER;

    if (Math.abs(height - lastAppliedContainerHeightRef.current) > 0.5) {
      lastAppliedContainerHeightRef.current = height;
      setContainerHeight(height);
    }
    if (
      Math.abs(totalSpacerHeight - lastAppliedSpacerHeightRef.current) > 0.5
    ) {
      lastAppliedSpacerHeightRef.current = totalSpacerHeight;
      setNavHeight(totalSpacerHeight);
    }
  }, [setNavHeight]);

  const handleContentHeightChange = useCallback(
    (height: number | string) => {
      const numericHeight = Number(height);
      heightRef.current.content = Number.isFinite(numericHeight)
        ? Math.max(0, numericHeight)
        : 0;
      if (compactRef.current) return;
      applyHeight();
    },
    [applyHeight],
  );

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useIsomorphicLayoutEffect(() => applyHeight(), [applyHeight, contentKey]);
  useIsomorphicLayoutEffect(() => applyHeight(), [applyHeight, surfacePhase]);

  useIsomorphicLayoutEffect(() => {
    if (compact) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const compactHeight = NAV_CARD_LAYOUT.compactHeight;
      const compactSpacerHeight = compactHeight + NAV_HEIGHT_BUFFER;

      lastAppliedContainerHeightRef.current = compactHeight;
      lastAppliedSpacerHeightRef.current = compactSpacerHeight;

      setContainerHeight(compactHeight);
      setNavHeight(compactSpacerHeight);
      return;
    }
    applyHeight();
  }, [compact, isHud, applyHeight, setNavHeight]);

  return { containerHeight, handleContentHeightChange };
}

export function useNavViewport(activeItem: NavItem | null = null) {
  const activeItemWidth = activeItem?.width;
  const isActiveItemHorizontal = Boolean(activeItem?.expandHorizontal);

  const getCurrentStackWidth = useCallback(
    () =>
      getNavCardWidth({
        width: activeItemWidth,
        expandHorizontal: isActiveItemHorizontal,
      }),
    [activeItemWidth, isActiveItemHorizontal],
  );

  const [stackWidth, setStackWidth] = useState(getCurrentStackWidth);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (typeof document !== "undefined") setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    let resizeFrameId: number | null = null;

    const handleResize = () => {
      if (resizeFrameId !== null) return;
      resizeFrameId = window.requestAnimationFrame(() => {
        resizeFrameId = null;
        setStackWidth(getCurrentStackWidth());
      });
    };

    setStackWidth(getCurrentStackWidth());
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeFrameId !== null) window.cancelAnimationFrame(resizeFrameId);
    };
  }, [getCurrentStackWidth]);

  return { portalTarget, stackWidth };
}

export function getLegacyCardStyle(style?: any): Record<string, any> {
  const legacyCardStyle: Record<string, any> = {};
  if (style?.background != null) legacyCardStyle.background = style.background;
  if (style?.borderColor != null)
    legacyCardStyle.borderColor = style.borderColor;
  return legacyCardStyle;
}

export function mergeStyleSection(
  baseStyle: any,
  stateStyle: any,
  hoverStyle: any,
  section: string,
) {
  return {
    ...toObject(baseStyle?.[section]),
    ...toObject(stateStyle?.[section]),
    ...toObject(hoverStyle?.[section]),
  };
}

export function resolveNavVisualStyle(
  style?: any,
  {
    isActive = false,
    isHovered = false,
  }: { isActive?: boolean; isHovered?: boolean } = {},
) {
  const baseStyle = toObject(style);
  const stateStyle = isActive
    ? toObject(baseStyle.active)
    : toObject(baseStyle.inactive);
  const hoverStyle = isHovered ? toObject(baseStyle.hover) : {};

  const sections: Record<string, any> = {
    card: {},
    icon: {},
    title: {},
    description: {},
  };

  for (const section of NAV_STYLE_SECTIONS) {
    sections[section] = mergeStyleSection(
      baseStyle,
      stateStyle,
      hoverStyle,
      section,
    );
  }

  sections.card = { ...getLegacyCardStyle(baseStyle), ...sections.card };

  return {
    ...sections,
    scale:
      hoverStyle?.card?.scale ?? stateStyle?.card?.scale ?? baseStyle?.scale,
  };
}

export function estimateCompactCardWidth(
  title?: string | null,
  stackWidth?: number,
): number {
  const titleLength = String(title || "").trim().length;
  const estimatedWidth = titleLength * 10 + COMPACT_CARD_HORIZONTAL_PADDING;
  const numericStackWidth = Number(stackWidth);

  const maxWidth = Number.isFinite(numericStackWidth)
    ? Math.max(
        COMPACT_CARD_MIN_WIDTH,
        numericStackWidth - COMPACT_CARD_MAX_OFFSET,
      )
    : COMPACT_CARD_MIN_WIDTH;
  return clamp(estimatedWidth, COMPACT_CARD_MIN_WIDTH, maxWidth);
}

export function shouldRenderInlineAction(
  {
    action,
    isLoading,
    isOverlay,
    path,
  }: {
    action?: any;
    isLoading?: boolean;
    isOverlay?: boolean;
    path?: string | null;
  },
  pathname: string,
): boolean {
  return (
    Boolean(action) &&
    !isLoading &&
    (isOverlay || !path || isInlineActionPathMatch(path, pathname))
  );
}

export function getIsItemActive(link: any, activeItem: any): boolean {
  if (!link || !activeItem) return false;
  if (link.path && activeItem.path && isSamePath(link.path, activeItem.path))
    return true;
  if (
    link.targetPath &&
    activeItem.targetPath &&
    isSamePath(link.targetPath, activeItem.targetPath)
  )
    return true;
  return Boolean(link.name && activeItem.name && link.name === activeItem.name);
}

export function canPreviewStackOnTopHover(
  compact?: boolean,
  expanded?: boolean,
): boolean {
  return !(compact && !expanded);
}
