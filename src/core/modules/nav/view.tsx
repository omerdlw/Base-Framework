"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Z_INDEX } from "@/core/tokens";
import { useClickOutside } from "@/core/hooks";
import {
  canPreviewStackOnTopHover,
  estimateCompactCardWidth,
  getIsItemActive,
  getItemKey,
  useNavHeightController,
  useNavViewport,
} from "./layout";
import { NavBreadcrumbsCard, useNavBreadcrumbs } from "./breadcrumbs";
import { NavSurfaceControls, useIsSurfaceExtensionsVisible } from "./surface";
import { useNavKeyboard } from "./behavior";
import { NavCardItem } from "./cards";
import {
  NAV_CARD_HEIGHT_CLOSE_TRANSITION,
  NAV_CARD_HEIGHT_OPEN_TRANSITION,
  NAV_COMPACT_RESTORE_DURATION_MS,
  NAV_COMPACT_STACK_ENTER_TRANSITION,
  NAV_COMPACT_STACK_EXIT_TRANSITION,
  NAV_STACK_TRANSITION,
  NAV_SURFACE_RESIZE_TRANSITION,
  getNavBackdropTransition,
  getNavStackAnimateProps,
  navBackdropVariants,
} from "./motion";
import { NAV_SURFACE_PHASE } from "./constants";
import {
  useNavigation,
  useNavigationActions,
  useNavigationSelector,
} from "./provider";
import { useIsFullscreenStateActive } from "@/core/primitives/fullscreen-state";

export function Nav() {
  const {
    activeItem,
    navigationItems,
    setNavHeight,
    setIsHovered,
    setExpanded,
    activeIndex,
    compact,
    isHudActive,
    expanded,
    navigate,
  } = useNavigation();
  const isFullscreenStateActive = useIsFullscreenStateActive();
  const { contextActions, hud } = useNavigationSelector(
    (state) => ({
      contextActions: state.contextActions,
      hud: state.hud,
    }),
    (left, right) =>
      left.contextActions === right.contextActions && left.hud === right.hud,
  );
  const { clearHud } = useNavigationActions();
  const [isStackHovered, setIsStackHovered] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [compactPresentation, setCompactPresentation] = useState<{
    direction: "compressing" | "restoring" | null;
    value: boolean;
  }>(() => ({
    direction: null,
    value: compact,
  }));
  const [prevCompact, setPrevCompact] = useState(compact);

  if (compact !== prevCompact) {
    setPrevCompact(compact);
    setCompactPresentation({
      direction: compact ? "compressing" : "restoring",
      value: compact,
    });
  }

  const presentedCompact = compactPresentation.value;
  const compactDirection = compactPresentation.direction;

  useEffect(() => {
    if (!compactDirection) return undefined;
    const timerId = window.setTimeout(() => {
      setCompactPresentation((previousPresentation) =>
        previousPresentation.direction
          ? {
              ...previousPresentation,
              direction: null,
            }
          : previousPresentation,
      );
    }, NAV_COMPACT_RESTORE_DURATION_MS);
    return () => window.clearTimeout(timerId);
  }, [compactDirection]);

  const navRef = useRef<HTMLDivElement>(null);
  const { portalTarget, stackWidth } = useNavViewport(activeItem);

  const clearHoverState = useCallback(() => {
    setIsStackHovered(false);
    setIsHovered(false);
  }, [setIsHovered]);

  const isSurfaceClosing =
    activeItem?.surfacePhase === NAV_SURFACE_PHASE.COLLAPSING_BODY ||
    activeItem?.surfacePhase === NAV_SURFACE_PHASE.RESTORING_HEADER;
  const isOverlayActive = Boolean(activeItem?.isOverlay && !isSurfaceClosing);
  const isBackdropVisible =
    !isFullscreenStateActive && (expanded || isOverlayActive);
  const isCompactPreviewActive =
    presentedCompact && !expanded && isStackHovered && !isOverlayActive;
  const isTopItemCompact =
    presentedCompact && !expanded && !isStackHovered && !isOverlayActive;
  const isCompactStack =
    !expanded &&
    presentedCompact &&
    !isCompactPreviewActive &&
    !isOverlayActive;
  const activeTitle = activeItem?.title || activeItem?.name || "";
  const { breadcrumbs } = useNavBreadcrumbs();
  const hasBreadcrumbs = Boolean(breadcrumbs && breadcrumbs.length > 1);
  const isBreadcrumbsCardVisible = Boolean(
    expanded && !isOverlayActive && hasBreadcrumbs,
  );
  const isExtensionsVisible = useIsSurfaceExtensionsVisible(activeItem);
  const compactStackWidth = useMemo(
    () => estimateCompactCardWidth(activeTitle, stackWidth),
    [activeTitle, stackWidth],
  );
  const contentKey = activeItem?.isSurface
    ? `surface:${activeItem.surfaceId ?? activeItem.path ?? "active"}`
    : isHudActive
      ? `hud:${hud?.id || "active"}`
      : `route:${activeItem?.path || activeItem?.name || "default"}`;
  const { containerHeight, handleContentHeightChange } = useNavHeightController(
    {
      compact: isTopItemCompact,
      contentKey,
      isHud: isHudActive,
      setNavHeight,
      surfacePhase: activeItem?.surfacePhase,
    },
  );

  const handleOutsideDismiss = useCallback(() => {
    if (activeItem?.isSurface) {
      if (typeof activeItem.closeAllSurfaces === "function") {
        activeItem.closeAllSurfaces();
        return;
      }
      if (typeof activeItem.closeSurface === "function") {
        activeItem.closeSurface();
        return;
      }
    }
    if (isOverlayActive) return;
    if (isCompactPreviewActive) {
      clearHoverState();
      return;
    }
    setExpanded(false);
  }, [
    activeItem,
    clearHoverState,
    isCompactPreviewActive,
    isOverlayActive,
    setExpanded,
  ]);

  useNavKeyboard({
    expanded,
    focusedIndex,
    isOverlayActive,
    navigate,
    navigationItems,
    setExpanded,
    setFocusedIndex,
  });

  useClickOutside(navRef, handleOutsideDismiss);

  useEffect(() => {
    queueMicrotask(() => {
      clearHoverState();
      setFocusedIndex(expanded ? activeIndex : -1);
    });
  }, [activeIndex, clearHoverState, expanded]);

  useEffect(() => {
    if (!isFullscreenStateActive) return;
    queueMicrotask(() => {
      setExpanded(false);
      clearHoverState();
    });
  }, [clearHoverState, isFullscreenStateActive, setExpanded]);

  const isNotFound = Boolean(
    activeItem?.isNotFound ||
    activeItem?.path === "not-found" ||
    activeItem?.type === "NOT_FOUND",
  );
  const isStatusActive = Boolean(activeItem?.isStatus || isNotFound);
  const statusStyle =
    isStatusActive && !isNotFound ? activeItem?.style || null : null;
  const visibleNavigationItems = expanded
    ? navigationItems
    : navigationItems.slice(
        0,
        isStatusActive ? 1 : isExtensionsVisible ? 2 : 3,
      );

  const renderedNavItems = visibleNavigationItems.map((item, index) => {
    const position = index;
    const isTop = position === 0;
    const isActive = getIsItemActive(item, activeItem);
    const isCompactCard = isTop && isCompactStack;
    const shouldSyncHover = presentedCompact;
    const canTopCardPreview =
      canPreviewStackOnTopHover(presentedCompact, expanded) && !isStatusActive;

    const handleMouseEnter = () => {
      if (expanded) setFocusedIndex(index);
      if (!isTop || !canTopCardPreview) return;
      setIsStackHovered(true);
      if (shouldSyncHover) setIsHovered(true);
    };

    const handleMouseLeave = () => {
      if (expanded) setFocusedIndex(-1);
      if (!isTop || !canTopCardPreview) return;
      setIsStackHovered(false);
      if (shouldSyncHover) setIsHovered(false);
    };

    const handleClick = () => {
      if (item.isOverlay || isStatusActive || item.isStatus) return;
      if (!expanded) {
        clearHoverState();
        setExpanded(true);
        return;
      }
      const targetPath = item.targetPath || item.path;
      if (targetPath)
        navigate(targetPath, {
          item,
        });
    };

    return (
      <NavCardItem
        key={getItemKey(item, index)}
        item={item}
        link={item}
        activeItem={activeItem}
        expanded={expanded}
        compact={isCompactCard}
        globalCompact={presentedCompact}
        restoreFromCompact={compactDirection === "restoring"}
        isCompacting={compactDirection === "compressing"}
        position={position}
        isTop={isTop}
        isActive={isActive}
        isStackHovered={isStackHovered}
        hasExtensions={isExtensionsVisible}
        isSurfaceActive={Boolean(
          activeItem?.isSurface &&
          activeItem?.surfacePhase !== NAV_SURFACE_PHASE.RESTORING_HEADER,
        )}
        statusStyle={statusStyle}
        isStatusActive={isStatusActive}
        isHudActive={isHudActive}
        hud={hud}
        clearHud={clearHud}
        contextCommands={contextActions}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onContentHeightChange={isTop ? handleContentHeightChange : null}
      />
    );
  });

  const navStackTransition = useMemo(() => {
    if (activeItem?.surfacePhase === NAV_SURFACE_PHASE.EXPANDING_BODY) {
      return NAV_CARD_HEIGHT_OPEN_TRANSITION;
    }
    if (activeItem?.surfacePhase === NAV_SURFACE_PHASE.OPEN) {
      return NAV_SURFACE_RESIZE_TRANSITION;
    }
    if (
      activeItem?.surfacePhase === NAV_SURFACE_PHASE.COLLAPSING_BODY ||
      activeItem?.surfacePhase === NAV_SURFACE_PHASE.RESTORING_HEADER
    ) {
      return NAV_CARD_HEIGHT_CLOSE_TRANSITION;
    }
    if (compactDirection === "compressing" || isCompactStack) {
      return NAV_COMPACT_STACK_ENTER_TRANSITION;
    }
    if (compactDirection === "restoring") {
      return NAV_COMPACT_STACK_EXIT_TRANSITION;
    }
    return NAV_STACK_TRANSITION;
  }, [activeItem?.surfacePhase, compactDirection, isCompactStack]);

  const navContent = (
    <>
      <AnimatePresence>
        {isBackdropVisible && (
          <motion.div
            key="nav-backdrop"
            variants={navBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={getNavBackdropTransition({
              expanded,
              isSurface: isOverlayActive,
            })}
            className="fixed inset-0 cursor-pointer bg-black/60"
            style={{
              zIndex: Z_INDEX.NAV_BACKDROP,
            }}
            onClick={handleOutsideDismiss}
          />
        )}
      </AnimatePresence>
      <motion.div
        id="nav-card-stack"
        ref={navRef}
        className="@container fixed inset-x-0 bottom-1 mx-auto touch-manipulation select-none"
        data-controls-hidden={
          expanded || activeItem?.isSurface ? "true" : "false"
        }
        style={{
          zIndex: Z_INDEX.NAV,
          maxWidth: "100vw",
          isolation: "isolate",
          contain: "layout",
        }}
        initial={false}
        animate={getNavStackAnimateProps({
          width: isCompactStack ? compactStackWidth : stackWidth,
          height: containerHeight,
          isBreadcrumbsVisible: isBreadcrumbsCardVisible,
          isExtensionsVisible,
          isFullscreen: isFullscreenStateActive,
        })}
        transition={navStackTransition}
        onAnimationComplete={() => {
          if (compactDirection) {
            setCompactPresentation((prev) =>
              prev.direction ? { ...prev, direction: null } : prev,
            );
          }
        }}
      >
        <NavSurfaceControls
          activeItem={activeItem}
          hasExtensions={isExtensionsVisible}
        />
        <AnimatePresence>
          {isBreadcrumbsCardVisible && <NavBreadcrumbsCard />}
        </AnimatePresence>
        <AnimatePresence initial={false}>{renderedNavItems}</AnimatePresence>
      </motion.div>
    </>
  );

  if (!portalTarget) return null;
  return createPortal(navContent, portalTarget);
}

export default Nav;
