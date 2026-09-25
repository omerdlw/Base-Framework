"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Z_INDEX } from "@/core/tokens";
import { EVENT_TYPES } from "@/core/events";
import { useClickOutside, useGlobalEvent } from "@/core/hooks";
import {
  canPreviewStackOnTopHover,
  estimateCompactCardWidth,
  getIsItemActive,
  getItemKey,
  useDockHeightController,
  useDockViewport,
} from "./layout";
import { DockBreadcrumbsCard, useDockBreadcrumbs } from "./breadcrumbs";
import { resolveDockScene } from "./attention";
import { DockSurfaceControls, useIsSurfaceExtensionsVisible } from "./surface";
import { useDockKeyboard } from "./behavior";
import { DockCardItem } from "./cards";
import {
  DOCK_CARD_HEIGHT_CLOSE_TRANSITION,
  DOCK_CARD_HEIGHT_OPEN_TRANSITION,
  DOCK_COMPACT_RESTORE_DURATION_MS,
  DOCK_COMPACT_STACK_ENTER_TRANSITION,
  DOCK_COMPACT_STACK_EXIT_TRANSITION,
  DOCK_STACK_TRANSITION,
  DOCK_SURFACE_RESIZE_TRANSITION,
  getDockBackdropTransition,
  getDockStackAnimateProps,
  dockBackdropVariants,
} from "./motion";
import { DOCK_SURFACE_PHASE } from "./constants";
import {
  useDock,
  useDockActions,
  useDockSelector,
} from "./hooks";
import { useIsFullscreenStateActive } from "@/core/primitives/fullscreen-state";

export function Dock() {
  const {
    activeItem,
    dockItems,
    setDockHeight,
    setIsHovered,
    setExpanded,
    activeIndex,
    compact,
    isHudActive,
    expanded,
    navigate,
  } = useDock();
  const isFullscreenStateActive = useIsFullscreenStateActive();
  const { contextActions, hud } = useDockSelector(
    (state) => ({
      contextActions: state.contextActions,
      hud: state.hud,
    }),
    (left, right) =>
      left.contextActions === right.contextActions && left.hud === right.hud,
  );
  const { clearHud } = useDockActions();
  const [isStackHovered, setIsStackHovered] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);

  useGlobalEvent(
    EVENT_TYPES.NOTIFICATION_VISIBILITY_CHANGE,
    (payload?: { visible?: boolean }) => {
      setIsNotificationVisible(Boolean(payload?.visible));
    },
  );

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
    }, DOCK_COMPACT_RESTORE_DURATION_MS);
    return () => window.clearTimeout(timerId);
  }, [compactDirection]);

  const dockRef = useRef<HTMLDivElement>(null);
  const { portalTarget, stackWidth } = useDockViewport(activeItem);

  const clearHoverState = useCallback(() => {
    setIsStackHovered(false);
    setIsHovered(false);
  }, [setIsHovered]);

  const isSurfaceClosing =
    activeItem?.surfacePhase === DOCK_SURFACE_PHASE.COLLAPSING_BODY ||
    activeItem?.surfacePhase === DOCK_SURFACE_PHASE.RESTORING_HEADER;
  const isOverlayActive = Boolean(activeItem?.isOverlay && !isSurfaceClosing);
  const isBackdropVisible =
    !isFullscreenStateActive && (expanded || isOverlayActive);
  const isCompactPreviewActive =
    presentedCompact && !expanded && isStackHovered && !isOverlayActive;
  const isTopItemCompact =
    presentedCompact &&
    !expanded &&
    !isStackHovered &&
    !isOverlayActive &&
    !isNotificationVisible;
  const isCompactStack =
    !expanded &&
    presentedCompact &&
    !isCompactPreviewActive &&
    !isOverlayActive &&
    !isNotificationVisible;
  const activeTitle = activeItem?.title || activeItem?.name || "";
  const { breadcrumbs } = useDockBreadcrumbs();
  const hasBreadcrumbs = Boolean(breadcrumbs && breadcrumbs.length > 1);
  const scene = resolveDockScene({
    activeItem,
    compact: presentedCompact,
    expanded,
    hasBreadcrumbs,
    isHudActive,
    isNotificationVisible,
    isOverlayActive,
  });
  const isBreadcrumbsCardVisible = scene.companion === "breadcrumbs";
  const isSubCardVisible = scene.isCompanionVisible;
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
  const { containerHeight, handleContentHeightChange } = useDockHeightController(
    {
      compact: isTopItemCompact,
      contentKey,
      isHud: isHudActive,
      setDockHeight,
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

  useDockKeyboard({
    expanded,
    focusedIndex,
    isOverlayActive,
    navigate,
    dockItems,
    setExpanded,
    setFocusedIndex,
  });

  useClickOutside(dockRef, handleOutsideDismiss);

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
  const visibleDockItems = expanded
    ? dockItems
    : dockItems.slice(
        0,
        isStatusActive ? 1 : isExtensionsVisible ? 2 : 3,
      );

  const positionedDockItems = visibleDockItems
    .map((item, index) => ({
      item,
      key: getItemKey(item, index),
      position: index,
    }))
    .sort((left, right) => left.key.localeCompare(right.key));

  const renderedDockItems = positionedDockItems.map(
    ({ item, key, position }) => {
      const isTop = position === 0;
      const isActive = getIsItemActive(item, activeItem);
      const isCompactCard = isTop && isCompactStack;
      const shouldSyncHover = presentedCompact;
      const canTopCardPreview =
        canPreviewStackOnTopHover(presentedCompact, expanded) &&
        !isStatusActive;

      const handleMouseEnter = () => {
        if (expanded) setFocusedIndex(position);
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
        <DockCardItem
          key={key}
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
          activeItem?.surfacePhase !== DOCK_SURFACE_PHASE.RESTORING_HEADER,
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

  const dockStackTransition = useMemo(() => {
    if (activeItem?.surfacePhase === DOCK_SURFACE_PHASE.EXPANDING_BODY) {
      return DOCK_CARD_HEIGHT_OPEN_TRANSITION;
    }
    if (activeItem?.surfacePhase === DOCK_SURFACE_PHASE.OPEN) {
      return DOCK_SURFACE_RESIZE_TRANSITION;
    }
    if (
      activeItem?.surfacePhase === DOCK_SURFACE_PHASE.COLLAPSING_BODY ||
      activeItem?.surfacePhase === DOCK_SURFACE_PHASE.RESTORING_HEADER
    ) {
      return DOCK_CARD_HEIGHT_CLOSE_TRANSITION;
    }
    if (compactDirection === "compressing" || isCompactStack) {
      return DOCK_COMPACT_STACK_ENTER_TRANSITION;
    }
    if (compactDirection === "restoring") {
      return DOCK_COMPACT_STACK_EXIT_TRANSITION;
    }
    return DOCK_STACK_TRANSITION;
  }, [activeItem?.surfacePhase, compactDirection, isCompactStack]);

  const dockContent = (
    <>
      <AnimatePresence>
        {isBackdropVisible && (
          <motion.div
            key="dock-backdrop"
            variants={dockBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={getDockBackdropTransition({
              expanded,
              isSurface: isOverlayActive,
            })}
            className="fixed inset-0 cursor-pointer bg-black/60 backdrop-blur-3xl"
            style={{
              zIndex: Z_INDEX.DOCK_BACKDROP,
            }}
            onClick={handleOutsideDismiss}
          />
        )}
      </AnimatePresence>
      <motion.div
        id="dock-card-stack"
        ref={dockRef}
        className="@container fixed inset-x-0 bottom-1 mx-auto touch-manipulation select-none"
        data-controls-hidden={
          expanded || activeItem?.isSurface ? "true" : "false"
        }
        style={{
          zIndex: Z_INDEX.DOCK,
          maxWidth: "100vw",
          contain: "layout",
        }}
        initial={false}
        animate={getDockStackAnimateProps({
          width: isCompactStack ? compactStackWidth : stackWidth,
          height: containerHeight,
          isBreadcrumbsVisible: isSubCardVisible,
          isExtensionsVisible,
          isFullscreen: isFullscreenStateActive,
        })}
        transition={dockStackTransition}
        onAnimationComplete={() => {
          if (compactDirection) {
            setCompactPresentation((prev) =>
              prev.direction ? { ...prev, direction: null } : prev,
            );
          }
        }}
      >
        <DockSurfaceControls
          activeItem={activeItem}
          hasExtensions={isExtensionsVisible}
        />
        <AnimatePresence>
          {isBreadcrumbsCardVisible && <DockBreadcrumbsCard />}
        </AnimatePresence>
        <AnimatePresence initial={false}>{renderedDockItems}</AnimatePresence>
      </motion.div>
    </>
  );

  if (!portalTarget) return null;
  return createPortal(dockContent, portalTarget);
}

export default Dock;
