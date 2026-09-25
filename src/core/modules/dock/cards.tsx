"use client";

import React, {
  Suspense,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useGlobalEvent } from "@/core/hooks";
import {
  DOCK_EVENTS,
  DOCK_SURFACE_PHASE,
  MAX_VISIBLE_STACKED_CARDS,
} from "./constants";
import {
  getImageIconStyle,
  getItemMeasurementKey,
  getLineClampStyle,
  getRouteMeasurementKey,
  resolveDockVisualStyle,
  shouldRenderInlineAction,
  splitStyle,
  getDockItemCardProps,
  useElementHeight,
} from "./layout";
import {
  isImageIconSource,
  isValidBannerUrl,
  isValidComponentType,
  resolveDockHeaderKey,
} from "./utils";
export { resolveDockHeaderKey };
import {
  DOCK_ACTION_DISMISS_TRANSITION,
  DOCK_BADGE_TRANSITION,
  DOCK_COMPOSITOR_STYLE,
  DOCK_FADE_TRANSITION,
  DOCK_HEADER_SWAP_TRANSITION,
  DOCK_HUD_TRANSITION,
  DOCK_ICON_TRANSITION,
  DOCK_SKELETON_PULSE_CLASS,
  DOCK_TAP_SCALE,
  DOCK_TEXT_ENTER_TRANSITION,
  getDockActionMotionProps,
  getDockCardContentAnimateProps,
  getDockCardContentTransition,
  getDockCardDelay,
  getDockDescriptionVariants,
  getDockItemAnimateValues,
  getDockItemCompactExitValues,
  getDockItemCompactRestoreValues,
  getDockItemTransition,
  dockActionDismissVariants,
  dockBadgeVariants,
  dockFadeVariants,
  dockIconVariants,
  dockHeaderSwapVariants,
  dockExtensionShelfVariants,
  dockHeaderRestoreVariants,
  dockCompactTitleVariants,
  dockHudVariants,
  textCrossfadeVariants,
} from "./motion";
import { resolveDockRoutePolicy, useRoutePrefetch } from "./routing";
import { DockHudView } from "./hud";
import { DockCommandBar } from "./commands";
import { DockSurfaceShell, DockSurfaceExtensionsBar } from "./surface";
import { DockMediaControls, DockMediaScrubber } from "./media";
import {
  useDockBackgroundActions as useBackgroundActions,
  useDockBackgroundState as useBackgroundState,
} from "./runtime";
import { cn } from "@/core/utils";
import { Button, Icon } from "@/core/primitives";
import type {
  DockBadgeState,
  DockHudDescriptor,
  DockIconOverlayConfig,
  DockItem,
} from "./types";

const stopAndPrevent = (event: any) => {
  event.stopPropagation();
  event.preventDefault();
};

const stopPropagationOnly = (event: any) => {
  event.stopPropagation();
};

function shouldShowVideoIcon({
  isActive,
  isVideo,
  isStatus = false,
}: {
  isActive?: boolean;
  isVideo?: boolean;
  isStatus?: boolean;
}): boolean {
  return Boolean(isActive && isVideo && !isStatus);
}

function renderIconNode(icon: any, size: number): ReactNode {
  return typeof icon === "string" ? <Icon icon={icon} size={size} /> : icon;
}

export interface DockDescriptionProps {
  text?: string | number | null;
  style?: any;
  maxLines?: number;
  animated?: boolean;
}

export const DockDescription = memo(function DockDescription({
  text,
  style,
  maxLines = 1,
  animated = true,
}: DockDescriptionProps) {
  if (text == null || text === "") return null;

  const { className, inlineStyle } = splitStyle(style);
  const { opacity = 0.7, ...restStyle } = inlineStyle;
  const isMultiline = Number(maxLines) > 1;
  const targetOpacity = typeof opacity === "number" ? opacity : 0.7;
  const sharedClass = cn(
    isMultiline ? "wrap-break-word whitespace-normal" : "truncate",
    "text-white",
    className,
  );
  const sharedStyle = {
    opacity: targetOpacity,
    ...getLineClampStyle(maxLines, restStyle),
  };

  if (!animated) {
    return (
      <div className="relative min-h-[1.25rem] w-full overflow-hidden text-sm">
        <p className={sharedClass} style={sharedStyle}>
          {text}
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[1.25rem] w-full overflow-hidden text-sm">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.p
          key={
            typeof text === "string" || typeof text === "number" ? text : "desc"
          }
          variants={getDockDescriptionVariants(targetOpacity)}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={DOCK_TEXT_ENTER_TRANSITION}
          className={sharedClass}
          style={sharedStyle}
        >
          {text}
        </motion.p>
      </AnimatePresence>
    </div>
  );
});

export interface DockIconOverlayProps {
  overlay?: DockIconOverlayConfig | null;
}

const DockIconOverlay = memo(function DockIconOverlay({
  overlay,
}: DockIconOverlayProps) {
  if (!overlay?.icon) return null;
  const { icon, onClick, title = "" } = overlay;

  const isInteractive = typeof onClick === "function";
  const content = isImageIconSource(icon) ? (
    <span
      className="size-full rounded-full bg-cover bg-center bg-no-repeat ring-1 ring-inset ring-white/10"
      style={{ backgroundImage: `url(${icon})` }}
    />
  ) : (
    <span className="center text-white">{renderIconNode(icon, 12)}</span>
  );

  const sharedClassName = cn(
    "center absolute -right-1.5 -bottom-1.5 z-20 size-6 overflow-hidden rounded-full",
    isInteractive ? "cursor-pointer" : "cursor-default",
  );

  return (
    <AnimatePresence mode="popLayout">
      {isInteractive ? (
        <motion.button
          key={icon}
          type="button"
          onClick={(event: any) => {
            stopAndPrevent(event);
            onClick?.(event);
          }}
          title={title || undefined}
          aria-label={title || "Action"}
          variants={dockBadgeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={DOCK_BADGE_TRANSITION}
          className={sharedClassName}
        >
          {content}
        </motion.button>
      ) : (
        <motion.div
          key={icon}
          title={title || undefined}
          aria-label={title || undefined}
          variants={dockBadgeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={DOCK_BADGE_TRANSITION}
          className={sharedClassName}
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

const bannerPreloadCache = new Set<string>();

function preloadBannerImage(url: string) {
  if (!isValidBannerUrl(url) || bannerPreloadCache.has(url)) return;
  if (typeof window === "undefined") return;
  bannerPreloadCache.add(url);
  const img = new Image();
  img.src = url;
  if (typeof img.decode === "function") {
    img.decode().catch(() => {});
  }
}

export interface DockCardBannerProps {
  banner?: any;
  bannerUrl?: string | null;
  bannerPosition?: string | null;
  bannerSize?: string | null;
  bannerRepeat?: string | null;
  bannerOpacity?: number | null;
  compact?: boolean;
  expanded?: boolean;
  isActive?: boolean;
  isSurfaceActive?: boolean;
  isHudActive?: boolean;
  isStatusActive?: boolean;
  style?: CSSProperties;
  className?: string;
}

export const DOCK_BANNER_BLUR_MASK =
  "linear-gradient(to right, black 0%, black 18%, rgba(0,0,0,0.75) 30%, rgba(0,0,0,0.15) 45%, transparent 56%, transparent 84%, rgba(0,0,0,0.5) 94%, black 100%)";

export const DOCK_BANNER_SHARP_MASK =
  "linear-gradient(to right, transparent 0%, transparent 18%, rgba(0,0,0,0.25) 30%, rgba(0,0,0,0.85) 45%, black 56%, black 84%, rgba(0,0,0,0.5) 94%, transparent 100%)";

export const DOCK_BANNER_SCRIM =
  "linear-gradient(to right, rgba(0, 0, 0, 0.22) 0%, rgba(0, 0, 0, 0.08) 30%, transparent 50%, transparent 80%, rgba(0, 0, 0, 0.18) 100%)";

export const DockCardBanner = memo(function DockCardBanner({
  banner,
  bannerUrl,
  bannerPosition,
  bannerSize,
  bannerRepeat,
  bannerOpacity,
  compact: _compact,
  expanded: _expanded = false,
  isActive = true,
  isSurfaceActive = false,
  isHudActive = false,
  isStatusActive = false,
  style,
  className,
}: DockCardBannerProps) {
  const bannerObj =
    typeof banner === "object" && banner !== null ? banner : null;
  const rawUrl =
    bannerObj?.url ||
    bannerObj?.bannerUrl ||
    (typeof banner === "string" ? banner : bannerUrl);
  const isValid = isValidBannerUrl(rawUrl);

  useEffect(() => {
    if (isValid && rawUrl) {
      preloadBannerImage(rawUrl);
    }
  }, [rawUrl, isValid]);

  if (!isValid) return null;

  const isVisible = Boolean(
    isActive && !isSurfaceActive && !isHudActive && !isStatusActive,
  );

  const resolvedPosition =
    bannerPosition ||
    bannerObj?.position ||
    bannerObj?.bannerPosition ||
    "center 45%";
  const resolvedSize =
    bannerSize || bannerObj?.size || bannerObj?.bannerSize || "cover";
  const resolvedRepeat =
    bannerRepeat || bannerObj?.repeat || bannerObj?.bannerRepeat || "no-repeat";
  const resolvedOpacity =
    bannerOpacity ?? bannerObj?.opacity ?? bannerObj?.bannerOpacity ?? 0.95;

  return (
    <motion.div
      aria-hidden="true"
      initial={false}
      animate={{
        opacity: isVisible ? 1 : 0,
      }}
      transition={DOCK_FADE_TRANSITION}
      style={{
        ...DOCK_COMPOSITOR_STYLE,
        pointerEvents: "none",
      }}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          WebkitMaskImage: DOCK_BANNER_BLUR_MASK,
          maskImage: DOCK_BANNER_BLUR_MASK,
        }}
      >
        <div
          className={cn(
            "absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-110",
            className,
          )}
          style={{
            backgroundImage: `url("${rawUrl}")`,
            backgroundPosition: resolvedPosition,
            backgroundSize: resolvedSize,
            backgroundRepeat: resolvedRepeat,
            transform: "scale(1.45)",
            transformOrigin: "center center",
            filter: "blur(2000px) saturate(1.6) brightness(1.04)",
            opacity: resolvedOpacity,
            ...style,
          }}
        />
      </div>
      <div
        className={cn(
          "absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105",
          className,
        )}
        style={{
          backgroundImage: `url("${rawUrl}")`,
          backgroundPosition: resolvedPosition,
          backgroundSize: resolvedSize,
          backgroundRepeat: resolvedRepeat,
          opacity: resolvedOpacity,
          WebkitMaskImage: DOCK_BANNER_SHARP_MASK,
          maskImage: DOCK_BANNER_SHARP_MASK,
          ...style,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background: DOCK_BANNER_SCRIM,
        }}
      />
    </motion.div>
  );
});

export interface DockIconProps {
  icon: any;
  iconOverlay?: any;
  style?: any;
  onClick?: ((event?: any) => void) | null;
  ariaLabel?: string;
  animated?: boolean;
}

export const DockIcon = memo(function DockIcon({
  icon,
  iconOverlay = null,
  style,
  onClick = null,
  ariaLabel = undefined,
  animated = true,
}: DockIconProps) {
  const { className, inlineStyle } = splitStyle(style);
  const { size = 24, ...iconStyle } = inlineStyle;

  const iconKey = typeof icon === "string" ? icon : "icon-node";
  const iconContent = isImageIconSource(icon) ? (
    <div
      className={cn(
        "size-12 shrink-0 rounded-[20px] bg-cover bg-center bg-no-repeat",
        className,
      )}
      style={{ ...getImageIconStyle(iconStyle, icon) }}
    />
  ) : (
    <div
      className={cn(
        "center size-12 shrink-0 rounded-[20px] bg-white/5 text-white transition-colors duration-200 hover:bg-white/10",
        className,
      )}
      style={iconStyle}
    >
      <span className="center shrink-0">{renderIconNode(icon, size)}</span>
    </div>
  );

  const iconElement = animated ? (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={iconKey}
        variants={dockIconVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={DOCK_ICON_TRANSITION}
        className="size-full"
      >
        {iconContent}
      </motion.div>
    </AnimatePresence>
  ) : (
    <div className="size-full">{iconContent}</div>
  );

  return (
    <div className="relative size-12 shrink-0">
      {typeof onClick === "function" ? (
        <motion.button
          {...getDockActionMotionProps()}
          type="button"
          className="size-full cursor-pointer p-0 focus:outline-none select-none"
          onClick={onClick}
          aria-label={ariaLabel || "Open"}
        >
          {iconElement}
        </motion.button>
      ) : (
        iconElement
      )}
      <DockIconOverlay overlay={iconOverlay} />
    </div>
  );
});

export interface DockTitleProps {
  text?: string | number | null;
  style?: any;
  animated?: boolean;
}

export const DockTitle = memo(function DockTitle({
  text,
  style,
  animated = true,
}: DockTitleProps) {
  const { className, inlineStyle } = splitStyle(style);
  const sharedClass = cn("truncate font-bold", className);

  if (!animated) {
    return (
      <div className="relative overflow-hidden">
        <h3 className={sharedClass} style={inlineStyle}>
          {text}
        </h3>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.h3
          key={
            typeof text === "string" || typeof text === "number"
              ? text
              : "title"
          }
          className={sharedClass}
          variants={dockFadeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={DOCK_TEXT_ENTER_TRANSITION}
          style={inlineStyle}
        >
          {text}
        </motion.h3>
      </AnimatePresence>
    </div>
  );
});

function useDockBadge(
  dockKey?: string | null,
  initialBadge?: any,
): DockBadgeState {
  const [badge, setBadge] = useState<DockBadgeState>({
    visible: Boolean(initialBadge),
    value: initialBadge,
    color: "bg-white/5",
  });

  useGlobalEvent(dockKey ? DOCK_EVENTS.UPDATE_BADGE : null, (data: any) => {
    if (data?.key === dockKey) {
      setBadge({
        visible: data.value != null && data.value !== "",
        color: data.color,
        value: data.value,
      });
    }
  });

  return badge;
}

function resolveInlineActionNode(action: any): ReactNode {
  if (React.isValidElement(action)) return action;
  if (typeof action === "function") {
    const ActionComponent = action;
    return <ActionComponent />;
  }
  return null;
}

function useActionComponent(
  item: DockItem,
  pathname: string,
  { isTop = false }: { isTop?: boolean } = {},
): ReactNode {
  const { action, isLoading, isOverlay, path, isStatus, isSurface } = item;
  const { isVideo } = useBackgroundState();

  return useMemo(() => {
    if (isLoading || (isOverlay && !isStatus) || isSurface) return null;
    if (isStatus) return action ? resolveInlineActionNode(action) : null;
    if (isTop && isVideo) return <DockMediaControls />;

    if (
      !shouldRenderInlineAction(
        { action, isLoading, isOverlay, path },
        pathname,
      )
    ) {
      return null;
    }
    return resolveInlineActionNode(action);
  }, [
    action,
    isLoading,
    isOverlay,
    isTop,
    isVideo,
    isStatus,
    isSurface,
    path,
    pathname,
  ]);
}

const Badge = memo(function Badge({ badge }: { badge?: DockBadgeState }) {
  return (
    <AnimatePresence mode="wait">
      {badge?.visible ? (
        <motion.div
          key={badge.value as any}
          variants={dockBadgeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={DOCK_BADGE_TRANSITION}
          className="center absolute -right-1 -bottom-1 z-20 size-6 overflow-hidden rounded-full bg-black text-[11px] leading-none font-bold tabular-nums text-white ring-2 ring-black"
        >
          {badge.value}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
});

const LoadingItemContent = memo(function LoadingItemContent() {
  return (
    <div className="flex min-h-[48px] w-full items-center gap-2.5">
      <div
        className={cn(
          "skeleton-block size-12 shrink-0 rounded-[20px]",
          DOCK_SKELETON_PULSE_CLASS,
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <div
          className={cn(
            "skeleton-block h-3.5 w-36 max-w-[60%] rounded-full",
            DOCK_SKELETON_PULSE_CLASS,
          )}
        />
        <div
          className={cn(
            "skeleton-block h-3 w-56 max-w-[85%] rounded-full",
            DOCK_SKELETON_PULSE_CLASS,
          )}
        />
      </div>
    </div>
  );
});

function SurfaceStackItemContent({
  item: propItem,
  link,
  surface,
  isActive,
}: {
  item?: DockItem;
  link?: DockItem;
  surface: any;
  isActive: boolean;
}) {
  const item = (propItem ?? link)!;
  const SurfaceComponent = surface.surfaceComponent;
  const surfaceContent = surface.surfaceContent;
  const title = surface.surfaceTitle ?? item.title ?? item.name ?? "";
  const closeLabel =
    surface.surfaceCloseLabel ?? item.closeLabel ?? "Close surface";
  const backLabel =
    surface.surfaceBackLabel ?? item.backLabel ?? "Previous step";

  const onClose =
    surface.dismissible === false
      ? null
      : surface.closeAllSurfaces || surface.closeSurface || item.onClose;
  const onBack =
    surface.onBack ||
    (surface.canGoBack ? surface.popStep || surface.closeSurface : null);

  return (
    <div
      aria-hidden={isActive ? undefined : true}
      className={cn(
        "@container relative w-full overflow-hidden rounded-[20px]",
        !isActive && "hidden",
      )}
      inert={isActive ? undefined : true}
      onClick={stopPropagationOnly}
    >
      <div className="w-full">
        <DockSurfaceShell
          title={title}
          onClose={onClose}
          onBack={onBack}
          allowSwipeDismiss={surface.allowSwipeDismiss !== false}
          closeLabel={closeLabel}
          backLabel={backLabel}
          isActive={isActive}
          onAnimationComplete={surface.onAnimationComplete}
          surfaceId={surface.surfaceId}
          surfacePhase={surface.surfacePhase}
          surfaceWidth={surface.width}
          contentClassName="w-full"
        >
          {isValidComponentType(SurfaceComponent) ? (
            <SurfaceComponent
              close={surface.closeSurface}
              closeAll={surface.closeAllSurfaces}
              pushStep={surface.pushStep}
              popStep={surface.popStep}
              goToStep={surface.goToStep}
              stepIndex={surface.stepIndex ?? 0}
              totalSteps={surface.totalSteps ?? 1}
              isFirstStep={surface.isFirstStep ?? true}
              isLastStep={surface.isLastStep ?? true}
              surfaceWidth={surface.width}
              {...surface.surfaceProps}
            />
          ) : (
            surfaceContent
          )}
        </DockSurfaceShell>
      </div>
    </div>
  );
}

function SurfaceItemContent({
  item: propItem,
  link,
}: {
  item?: DockItem;
  link?: DockItem;
}) {
  const item = (propItem ?? link)!;
  const surfaceStackEntries = item.surfaceStackEntries?.length
    ? item.surfaceStackEntries
    : [item];
  return (
    <>
      {surfaceStackEntries.map((surface: any) => (
        <SurfaceStackItemContent
          key={surface.surfaceId ?? "dock-surface"}
          item={item}
          surface={surface}
          isActive={surface.surfaceId === item.surfaceId}
        />
      ))}
    </>
  );
}

export interface DockCardHeaderProps {
  item?: DockItem;
  link?: DockItem;
  activeItem?: DockItem | null;
  itemStyle: any;
  badge?: DockBadgeState;
  showVideoIcon?: boolean;
  isPlaying?: boolean;
  effectiveIconOverlay?: DockIconOverlayConfig | null;
  isIconInteractive?: boolean;
  handleIconClick?: (event: any) => void;
  description?: string | null;
  isTop?: boolean;
  contextCommands?: any[];
}

export const DockCardHeader = memo(function DockCardHeader({
  item: propItem,
  link,
  activeItem = null,
  itemStyle,
  badge,
  showVideoIcon = false,
  isPlaying = false,
  effectiveIconOverlay = null,
  isIconInteractive = false,
  handleIconClick,
  description,
  isTop = false,
  contextCommands = [],
}: DockCardHeaderProps) {
  const item = (propItem ?? link)!;
  const headerKey = useMemo(
    () => resolveDockHeaderKey({ link: item, description, showVideoIcon }),
    [description, item, showVideoIcon],
  );

  return (
    <div className="relative min-h-[48px] w-full">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={headerKey}
          variants={dockHeaderSwapVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={DOCK_HEADER_SWAP_TRANSITION}
          className="relative flex w-full items-center gap-2.5"
          style={{ ...DOCK_COMPOSITOR_STYLE }}
        >
          <div className="center relative shrink-0">
            {item.icon ? (
              <DockIcon
                animated={false}
                icon={
                  showVideoIcon
                    ? isPlaying
                      ? "mdi:pause"
                      : "mdi:play"
                    : item.icon
                }
                iconOverlay={effectiveIconOverlay}
                style={itemStyle.icon}
                onClick={isIconInteractive ? handleIconClick : null}
                ariaLabel={
                  isIconInteractive
                    ? showVideoIcon
                      ? isPlaying
                        ? "Pause video"
                        : "Play video"
                      : "Open"
                    : undefined
                }
              />
            ) : (
              <div className="size-12" />
            )}
            {!showVideoIcon && !effectiveIconOverlay && <Badge badge={badge} />}
          </div>

          <div className="relative flex w-full flex-1 items-center justify-between gap-2.5 overflow-hidden">
            <div className="flex h-full min-w-0 flex-1 flex-col justify-center -space-y-0.5">
              <div className="flex items-center gap-1.5">
                <DockTitle
                  animated={false}
                  text={item.title || item.name}
                  style={{
                    ...itemStyle.title,
                    className: cn(itemStyle.title?.className, "text-base"),
                  }}
                />
              </div>
              {Boolean(description) && (
                <DockDescription
                  animated={false}
                  text={description}
                  style={itemStyle.description}
                />
              )}
            </div>
            {isTop && !item.isStatus ? (
              <DockCommandBar
                activeItem={activeItem || item}
                contextCommands={contextCommands}
              />
            ) : null}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
});

interface StandardItemContentProps {
  item?: DockItem;
  link?: DockItem;
  activeItem?: DockItem | null;
  isTop?: boolean;
  itemStyle: any;
  badge?: DockBadgeState;
  isActive?: boolean;
  footerNode?: ReactNode;
  isHudActive?: boolean;
  hud?: DockHudDescriptor | null;
  clearHud?: ((id?: string) => void) | null;
  contextCommands?: any[];
  pathname: string;
}

function StandardItemContent({
  item: propItem,
  link,
  activeItem = null,
  isTop = false,
  itemStyle,
  badge,
  isActive = false,
  footerNode,
  isHudActive = false,
  hud = null,
  clearHud = null,
  contextCommands = [],
  pathname,
}: StandardItemContentProps) {
  const item = (propItem ?? link)!;
  const { isVideo, isPlaying } = useBackgroundState();
  const { toggleVideo } = useBackgroundActions();

  const showVideoIcon = shouldShowVideoIcon({
    isActive,
    isVideo,
    isStatus: item.isStatus,
  });
  const description = item.description;
  const effectiveIconOverlay = showVideoIcon ? null : item.iconOverlay;
  const isIconInteractive = Boolean(item.onClick || showVideoIcon);

  const handleIconClick = useCallback(
    (event: any) => {
      if (showVideoIcon) {
        stopAndPrevent(event);
        toggleVideo();
        return;
      }
      if (item.onClick) {
        stopAndPrevent(event);
        item.onClick(event);
      }
    },
    [item, showVideoIcon, toggleVideo],
  );

  return (
    <AnimatePresence initial={false}>
      {isTop && isHudActive ? (
        <motion.div
          key={`dock-hud:${hud?.id || "active"}`}
          variants={dockHudVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={DOCK_HUD_TRANSITION}
          style={DOCK_COMPOSITOR_STYLE}
          className="relative flex w-full items-center justify-between"
        >
          <DockHudView
            clearHud={clearHud || undefined}
            hud={hud}
            pathname={pathname}
          />
        </motion.div>
      ) : (
        <motion.div
          key="dock-standard-content"
          variants={dockFadeVariants}
          initial={false}
          animate="visible"
          exit="exit"
          transition={DOCK_TEXT_ENTER_TRANSITION}
          style={DOCK_COMPOSITOR_STYLE}
          className="relative flex h-auto w-full flex-col gap-2.5"
        >
          <DockCardHeader
            item={item}
            activeItem={activeItem}
            itemStyle={itemStyle}
            badge={badge}
            showVideoIcon={showVideoIcon}
            isPlaying={isPlaying}
            effectiveIconOverlay={effectiveIconOverlay}
            isIconInteractive={isIconInteractive}
            handleIconClick={handleIconClick}
            description={description}
            isTop={isTop}
            contextCommands={contextCommands}
          />
          {footerNode ? (
            <div
              key="dock-surface-footer"
              className="relative z-10 w-full overflow-visible"
            >
              {footerNode}
            </div>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export interface DockCardItemProps {
  ref?: React.Ref<HTMLDivElement>;
  activeItem?: DockItem | null;
  onContentHeightChange?: ((height: number) => void) | null;
  isStackHovered?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  compact?: boolean;
  globalCompact?: boolean;
  restoreFromCompact?: boolean;
  isCompacting?: boolean;
  expanded?: boolean;
  hasExtensions?: boolean;
  position: number;
  onClick?: (event?: any) => void;
  isTop?: boolean;
  item?: DockItem;
  link?: DockItem;
  isActive?: boolean;
  statusStyle?: any;
  isStatusActive?: boolean;
  isHudActive?: boolean;
  isSurfaceActive?: boolean;
  hud?: DockHudDescriptor | null;
  clearHud?: ((id?: string) => void) | null;
  contextCommands?: any[];
}

export const DockCardItem = memo(function DockCardItem({
  ref,
  activeItem = null,
  onContentHeightChange,
  isStackHovered,
  onMouseEnter,
  onMouseLeave,
  compact,
  globalCompact,
  restoreFromCompact = false,
  isCompacting = false,
  expanded,
  hasExtensions = false,
  position,
  onClick,
  isTop = false,
  item: propItem,
  link,
  isActive = false,
  statusStyle = null,
  isStatusActive = false,
  isHudActive = false,
  isSurfaceActive = false,
  hud = null,
  clearHud = null,
  contextCommands = [],
}: DockCardItemProps) {
  const item = (propItem ?? link)!;
  const [isHovered, setIsHovered] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { cancelRoutePrefetch, prefetchRoute } = useRoutePrefetch(router);
  const { isVideo } = useBackgroundState();

  const isTopHudActive = Boolean(isTop && isHudActive);
  const isCurrentActive = Boolean(
    !item.disabled && !item.isInactive && (expanded || isTop || isActive),
  );
  const isCurrentHud = Boolean(
    isHudActive || isTopHudActive || Boolean(hud) || Boolean(item.isHud),
  );
  const isCurrentStatus = Boolean(
    isStatusActive ||
    Boolean(item.isStatus) ||
    Boolean(statusStyle) ||
    Boolean(item.isNotFound),
  );
  const isCurrentSurface = Boolean(
    isSurfaceActive ||
    Boolean(item.isSurface) ||
    Boolean(
      activeItem?.isSurface &&
      activeItem?.surfacePhase !== DOCK_SURFACE_PHASE.RESTORING_HEADER,
    ),
  );
  const isHeaderRestoring =
    item.surfacePhase === DOCK_SURFACE_PHASE.RESTORING_HEADER;
  const showVideoScrubber = Boolean(
    isTop &&
    isVideo &&
    (!item.isSurface || isHeaderRestoring) &&
    !item.isStatus,
  );

  const badge = useDockBadge(item.name?.toLowerCase(), item.badge);
  const ActionComponent = useActionComponent(item, pathname, { isTop });
  const cardContentRef = useRef<HTMLDivElement>(null);
  const showBorder = expanded ? isHovered : isHovered || isStackHovered;

  const effectiveStyle = useMemo(() => {
    if (!statusStyle) return item.style;
    if (!item.style) return statusStyle;
    return {
      ...statusStyle,
      ...item.style,
      card: { ...statusStyle.card, ...item.style.card },
      icon: { ...statusStyle.icon, ...item.style.icon },
      title: { ...statusStyle.title, ...item.style.title },
      description: { ...statusStyle.description, ...item.style.description },
    };
  }, [item.style, statusStyle]);

  const itemStyle = useMemo<any>(
    () =>
      resolveDockVisualStyle(effectiveStyle, {
        isActive,
        isHovered: showBorder,
      }),
    [effectiveStyle, isActive, showBorder],
  );

  const renderedActionNode =
    (item.isSurface && !isHeaderRestoring) || isTopHudActive
      ? null
      : ActionComponent;
  const hasNestedInteractiveContent = Boolean(
    renderedActionNode || (item.isSurface && !isHeaderRestoring),
  );

  useElementHeight(
    onContentHeightChange,
    cardContentRef,
    isTop,
    getRouteMeasurementKey(
      pathname,
      getItemMeasurementKey({
        link: item,
        expanded: Boolean(expanded),
        isHovered,
        isStackHovered: Boolean(isStackHovered),
        compact: Boolean(compact),
        isHud: isTopHudActive,
      }),
    ),
  );

  const handleMouseEnter = useCallback(() => {
    if (item.isOverlay) return;
    setIsHovered(true);
    if (
      resolveDockRoutePolicy({ href: item.path ?? "", item }).prefetch &&
      item.path
    )
      prefetchRoute(item.path);
    if (!expanded) onMouseEnter?.();
  }, [expanded, item, onMouseEnter, prefetchRoute]);

  const handleMouseLeave = useCallback(() => {
    if (item.isOverlay) return;
    if (item.path) cancelRoutePrefetch(item.path);
    setIsHovered(false);
    if (!expanded) onMouseLeave?.();
  }, [cancelRoutePrefetch, expanded, item, onMouseLeave]);

  const handleFocus = useCallback(() => {
    if (item.isOverlay) return;
    setIsHovered(true);
    const targetHref = item.targetPath || item.path;
    if (
      resolveDockRoutePolicy({ href: targetHref ?? "", item }).prefetch &&
      targetHref
    ) {
      prefetchRoute(targetHref, { immediate: true });
    }
    onMouseEnter?.();
  }, [item, onMouseEnter, prefetchRoute]);

  const handleBlur = useCallback(() => {
    if (item.isOverlay) return;
    setIsHovered(false);
    onMouseLeave?.();
  }, [item, onMouseLeave]);

  const handleKeyDown = useCallback(
    (event: any) => {
      if (event.target !== event.currentTarget) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onClick?.(event);
    },
    [onClick],
  );

  const handleScroll = useCallback((event: any) => {
    if (event.currentTarget.scrollTop !== 0) event.currentTarget.scrollTop = 0;
  }, []);

  const isExtensionShelf = Boolean(
    !expanded && position === 1 && hasExtensions,
  );
  const isCollapsedBackgroundCard = Boolean(
    !expanded && position > 0 && !isExtensionShelf,
  );
  const isCollapsedGhostCard = Boolean(
    !expanded && position >= MAX_VISIBLE_STACKED_CARDS && !isExtensionShelf,
  );
  const {
    className: cardClassName,
    style: cardStyle,
    motionValues,
  } = getDockItemCardProps({
    expanded,
    position,
    cardStyle: itemStyle.card,
    cardScale: itemStyle.scale,
    isAnchoredToBottom: item.isSurface,
    visibleCount:
      (globalCompact || item.isStatus) && !isStackHovered
        ? 1
        : hasExtensions && !expanded
          ? 2
          : 3,
    hasExtensions,
  });

  const cardDelay = useMemo(
    () => getDockCardDelay({ expanded, isStackHovered, position }),
    [expanded, isStackHovered, position],
  );

  if (isCollapsedGhostCard) {
    return (
      <motion.div
        ref={ref}
        aria-hidden="true"
        tabIndex={-1}
        className={cn(cardClassName, "pointer-events-none select-none")}
        style={cardStyle}
        initial={
          restoreFromCompact
            ? getDockItemCompactRestoreValues({ motionValues, position })
            : false
        }
        animate={getDockItemAnimateValues({
          motionValues,
          expanded,
          isStackHovered,
          isSurfaceActive,
          position,
        })}
        transition={getDockItemTransition({
          expanded,
          isStackHovered,
          isRestoringDeck: restoreFromCompact,
          isCompactingDeck:
            isCompacting || (globalCompact && !restoreFromCompact),
          position,
          delay: cardDelay,
        })}
        exit={getDockItemCompactExitValues({ motionValues, position })}
      />
    );
  }

  return (
    <motion.div
      ref={ref}
      className={cardClassName}
      data-controls-anchor={isTop ? "true" : undefined}
      style={cardStyle}
      initial={
        restoreFromCompact && position > 0
          ? getDockItemCompactRestoreValues({ motionValues, position })
          : false
      }
      animate={getDockItemAnimateValues({
        motionValues,
        expanded,
        isStackHovered,
        isSurfaceActive,
        position,
      })}
      transition={getDockItemTransition({
        expanded,
        isStackHovered,
        isRestoringDeck: restoreFromCompact,
        isCompactingDeck:
          isCompacting || (globalCompact && !restoreFromCompact),
        position,
        delay: cardDelay,
      })}
      whileTap={
        !item.isOverlay && !item.isStatus && !isCollapsedBackgroundCard
          ? { scale: (motionValues?.scale || 1) * DOCK_TAP_SCALE }
          : undefined
      }
      exit={getDockItemCompactExitValues({ motionValues, position })}
      role={hasNestedInteractiveContent ? "group" : "button"}
      aria-hidden={isCollapsedBackgroundCard ? "true" : undefined}
      aria-label={
        compact
          ? `${item.title || item.name || "Dock item"}; click again to expand dock`
          : undefined
      }
      title={compact ? "Click again to expand dock" : undefined}
      tabIndex={
        item.isOverlay || item.isStatus || isCollapsedBackgroundCard ? -1 : 0
      }
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onScroll={handleScroll}
      onClick={onClick}
    >
      <DockCardBanner
        banner={item.banner}
        bannerUrl={item.bannerUrl}
        bannerPosition={item.bannerPosition}
        bannerSize={item.bannerSize}
        bannerRepeat={item.bannerRepeat}
        bannerOpacity={item.bannerOpacity}
        compact={compact}
        expanded={expanded}
        isActive={isCurrentActive}
        isSurfaceActive={isCurrentSurface}
        isHudActive={isCurrentHud}
        isStatusActive={isCurrentStatus}
      />

      {showVideoScrubber && <DockMediaScrubber />}

      <AnimatePresence>
        {compact && (
          <motion.div
            key="compact-title-overlay"
            variants={dockCompactTitleVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="pointer-events-none absolute inset-0 z-10 flex h-full items-center justify-center px-4"
          >
            <div className="min-w-0">
              <DockTitle
                text={item.title || item.name}
                style={{
                  ...itemStyle.title,
                  className: cn(
                    "normal-case text-center text-sm underline decoration-dotted underline-offset-2",
                    itemStyle.title?.className,
                  ),
                  textTransform: "none",
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        ref={cardContentRef}
        className={cn(
          "flow-root w-full overflow-hidden",
          isExtensionShelf && "min-h-[96px]",
        )}
        animate={getDockCardContentAnimateProps({
          compact,
          expanded,
          position,
          isExtensionShelf,
        })}
        transition={getDockCardContentTransition({
          compact,
          isRestoringFromCompact: restoreFromCompact,
        })}
        style={{
          ...DOCK_COMPOSITOR_STYLE,
          pointerEvents:
            compact || (!expanded && position > 0 && !isExtensionShelf)
              ? "none"
              : "auto",
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {item.isSurface &&
          item.surfacePhase !== DOCK_SURFACE_PHASE.DISMISSING_ACTION &&
          item.surfacePhase !== DOCK_SURFACE_PHASE.RESTORING_HEADER ? (
            <motion.div
              key="surface-content-layer"
              variants={dockHeaderSwapVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={DOCK_HEADER_SWAP_TRANSITION}
              style={DOCK_COMPOSITOR_STYLE}
              className="w-full overflow-hidden rounded-[20px]"
            >
              <SurfaceItemContent item={item} />
            </motion.div>
          ) : isExtensionShelf ? (
            <motion.div
              key="extension-shelf-layer"
              variants={dockExtensionShelfVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={DOCK_HEADER_SWAP_TRANSITION}
              style={DOCK_COMPOSITOR_STYLE}
              className="relative flex h-[45px] w-full items-center justify-between"
            >
              <DockSurfaceExtensionsBar activeItem={activeItem} />
            </motion.div>
          ) : (
            <motion.div
              key="standard-content-layer"
              variants={dockHeaderRestoreVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={DOCK_HEADER_SWAP_TRANSITION}
              style={DOCK_COMPOSITOR_STYLE}
              className="w-full"
            >
              {item.isLoading ? (
                <LoadingItemContent />
              ) : (
                <StandardItemContent
                  item={item}
                  activeItem={activeItem}
                  isTop={isTop}
                  itemStyle={itemStyle}
                  badge={badge}
                  isActive={isActive}
                  isHudActive={isTopHudActive}
                  hud={hud}
                  clearHud={clearHud}
                  contextCommands={contextCommands}
                  pathname={pathname}
                  footerNode={
                    renderedActionNode ? (
                      <AnimatePresence mode="popLayout" initial={false}>
                        {item.surfacePhase ===
                        DOCK_SURFACE_PHASE.DISMISSING_ACTION ? (
                          <motion.div
                            key="dock-action-component-dismiss"
                            variants={dockActionDismissVariants}
                            initial="visible"
                            animate="exit"
                            exit="exit"
                            transition={DOCK_ACTION_DISMISS_TRANSITION}
                            className="flow-root overflow-visible"
                            style={{ overflow: "visible" }}
                            onClick={stopPropagationOnly}
                          >
                            <Suspense>{renderedActionNode}</Suspense>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="dock-action-component"
                            variants={textCrossfadeVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={DOCK_FADE_TRANSITION}
                            className="flow-root overflow-visible"
                            style={{ overflow: "visible" }}
                            onClick={stopPropagationOnly}
                          >
                            <Suspense>{renderedActionNode}</Suspense>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    ) : null
                  }
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
});
