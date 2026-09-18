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
import { NAV_EVENTS, NAV_SURFACE_PHASE } from "./constants";
import {
  getImageIconStyle,
  getItemMeasurementKey,
  getLineClampStyle,
  getRouteMeasurementKey,
  resolveNavVisualStyle,
  shouldRenderInlineAction,
  splitStyle,
  getNavItemCardProps,
  useElementHeight,
} from "./layout";
import {
  isImageIconSource,
  isValidBannerUrl,
  isValidComponentType,
  resolveNavHeaderKey,
} from "./utils";
export { resolveNavHeaderKey };
import {
  NAV_ACTION_DISMISS_TRANSITION,
  NAV_BADGE_TRANSITION,
  NAV_COMPOSITOR_STYLE,
  NAV_FADE_TRANSITION,
  NAV_HEADER_SWAP_TRANSITION,
  NAV_HUD_TRANSITION,
  NAV_ICON_TRANSITION,
  NAV_SKELETON_PULSE_CLASS,
  NAV_TAP_SCALE,
  NAV_TEXT_ENTER_TRANSITION,
  getNavActionMotionProps,
  getNavCardContentAnimateProps,
  getNavCardContentTransition,
  getNavCardDelay,
  getNavDescriptionVariants,
  getNavItemAnimateValues,
  getNavItemCompactExitValues,
  getNavItemCompactRestoreValues,
  getNavItemTransition,
  navActionDismissVariants,
  navBadgeVariants,
  navFadeVariants,
  navIconVariants,
  navHeaderSwapVariants,
  navExtensionShelfVariants,
  navHeaderRestoreVariants,
  navCompactTitleVariants,
  navHudVariants,
  textCrossfadeVariants,
} from "./motion";
import { resolveNavigationRoutePolicy, useRoutePrefetch } from "./routing";
import { NavHudView } from "./hud";
import { NavCommandBar } from "./commands";
import { NavSurfaceShell, NavSurfaceExtensionsBar } from "./surface";
import { NavMediaControls, NavMediaScrubber } from "./media";
import {
  useBackgroundActions,
  useBackgroundState,
} from "@/core/modules/background";
import { cn } from "@/core/utils";
import { Button } from "@/core/primitives";
import Iconify from "@/core/primitives/icon";
import type {
  NavBadgeState,
  NavHudDescriptor,
  NavIconOverlayConfig,
  NavItem,
} from "./types";

const ButtonComponent = Button as any;
const IconifyComponent = Iconify as any;

const BANNER_MASK_STYLE = Object.freeze({
  backgroundImage: "",
  maskImage:
    "linear-gradient(to right, transparent 0%, transparent 18%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.65) 60%, black 85%, black 100%)",
  WebkitMaskImage:
    "linear-gradient(to right, transparent 0%, transparent 18%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.65) 60%, black 85%, black 100%)",
});

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
  return typeof icon === "string" ? (
    <IconifyComponent icon={icon} size={size} />
  ) : (
    icon
  );
}

export interface NavDescriptionProps {
  text?: string | number | null;
  style?: any;
  maxLines?: number;
  animated?: boolean;
}

export const NavDescription = memo(function NavDescription({
  text,
  style,
  maxLines = 1,
  animated = true,
}: NavDescriptionProps) {
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
          variants={getNavDescriptionVariants(targetOpacity)}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={NAV_TEXT_ENTER_TRANSITION}
          className={sharedClass}
          style={sharedStyle}
        >
          {text}
        </motion.p>
      </AnimatePresence>
    </div>
  );
});

export interface NavIconOverlayProps {
  overlay?: NavIconOverlayConfig | null;
}

const NavIconOverlay = memo(function NavIconOverlay({
  overlay,
}: NavIconOverlayProps) {
  if (!overlay?.icon) return null;
  const { icon, onClick, title = "" } = overlay;

  const isInteractive = typeof onClick === "function";
  const content = isImageIconSource(icon) ? (
    <span
      className="size-full rounded-full bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${icon})` }}
    />
  ) : (
    <span className="text-white">{renderIconNode(icon, 12)}</span>
  );

  const sharedClassName = cn(
    "absolute -right-1 -bottom-1 z-20 flex size-6 items-center justify-center overflow-hidden rounded-full bg-black ring ring-black",
    isInteractive ? "cursor-pointer" : "cursor-default",
  );

  return (
    <AnimatePresence mode="popLayout">
      {isInteractive ? (
        <ButtonComponent
          key={icon}
          type="button"
          onClick={(event: any) => {
            stopAndPrevent(event);
            onClick?.(event);
          }}
          title={title || undefined}
          aria-label={title || "Action"}
          variants={navBadgeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={NAV_BADGE_TRANSITION}
          className={sharedClassName}
        >
          {content}
        </ButtonComponent>
      ) : (
        <motion.div
          key={icon}
          title={title || undefined}
          aria-label={title || undefined}
          variants={navBadgeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={NAV_BADGE_TRANSITION}
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

export interface NavCardBannerProps {
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

export const NavCardBanner = memo(function NavCardBanner({
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
}: NavCardBannerProps) {
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
    "right 20%";
  const resolvedSize =
    bannerSize || bannerObj?.size || bannerObj?.bannerSize || "cover";
  const resolvedRepeat =
    bannerRepeat || bannerObj?.repeat || bannerObj?.bannerRepeat || "no-repeat";
  const resolvedOpacity =
    bannerOpacity ?? bannerObj?.opacity ?? bannerObj?.bannerOpacity ?? 0.8;

  return (
    <motion.div
      aria-hidden="true"
      initial={false}
      animate={{
        opacity: isVisible ? 1 : 0,
      }}
      transition={NAV_FADE_TRANSITION}
      style={{
        ...NAV_COMPOSITOR_STYLE,
        pointerEvents: "none",
      }}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[30px] select-none"
    >
      <div
        className={cn(
          "absolute inset-0 will-change-transform",
          isVisible &&
            "transition-transform duration-700 ease-out group-hover:scale-105",
          className,
        )}
        style={{
          ...BANNER_MASK_STYLE,
          ...NAV_COMPOSITOR_STYLE,
          backgroundImage: `url("${rawUrl}")`,
          backgroundPosition: resolvedPosition,
          backgroundSize: resolvedSize,
          backgroundRepeat: resolvedRepeat,
          opacity: resolvedOpacity,
          ...style,
        }}
      />
    </motion.div>
  );
});

export interface NavIconProps {
  icon: any;
  iconOverlay?: any;
  style?: any;
  onClick?: ((event?: any) => void) | null;
  ariaLabel?: string;
  animated?: boolean;
}

export const NavIcon = memo(function NavIcon({
  icon,
  iconOverlay = null,
  style,
  onClick = null,
  ariaLabel = undefined,
  animated = true,
}: NavIconProps) {
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
        "center size-12 rounded-[20px] bg-white/5 hover:bg-white/10 text-white",
        className,
      )}
      style={iconStyle}
    >
      <span>{renderIconNode(icon, size)}</span>
    </div>
  );

  const iconElement = animated ? (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={iconKey}
        variants={navIconVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={NAV_ICON_TRANSITION}
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
          {...getNavActionMotionProps()}
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
      <NavIconOverlay overlay={iconOverlay} />
    </div>
  );
});

export interface NavTitleProps {
  text?: string | number | null;
  style?: any;
  animated?: boolean;
}

export const NavTitle = memo(function NavTitle({
  text,
  style,
  animated = true,
}: NavTitleProps) {
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
          variants={navFadeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={NAV_TEXT_ENTER_TRANSITION}
          style={inlineStyle}
        >
          {text}
        </motion.h3>
      </AnimatePresence>
    </div>
  );
});

function useNavBadge(
  navKey?: string | null,
  initialBadge?: any,
): NavBadgeState {
  const [badge, setBadge] = useState<NavBadgeState>({
    visible: Boolean(initialBadge),
    value: initialBadge,
    color: "bg-white/5",
  });

  useGlobalEvent(navKey ? NAV_EVENTS.UPDATE_BADGE : null, (data: any) => {
    if (data?.key === navKey) {
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
  item: NavItem,
  pathname: string,
  { isTop = false }: { isTop?: boolean } = {},
): ReactNode {
  const { action, isLoading, isOverlay, path, isStatus, isSurface } = item;
  const { isVideo } = useBackgroundState();

  return useMemo(() => {
    if (isLoading || (isOverlay && !isStatus) || isSurface) return null;
    if (isStatus) return action ? resolveInlineActionNode(action) : null;
    if (isTop && isVideo) return <NavMediaControls />;

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

const Badge = memo(function Badge({ badge }: { badge?: NavBadgeState }) {
  return (
    <AnimatePresence mode="wait">
      {badge?.visible ? (
        <motion.div
          key={badge.value as any}
          variants={navBadgeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={NAV_BADGE_TRANSITION}
          className="absolute -right-1 -bottom-1 z-20 flex size-6 items-center justify-center overflow-hidden rounded-full bg-black text-xs font-semibold text-white ring ring-black"
        >
          {badge.value}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
});

const LoadingItemContent = memo(function LoadingItemContent() {
  return (
    <div className="flex h-auto w-full items-center gap-2.5">
      <div
        className={cn(
          "skeleton-block size-12 shrink-0 rounded-[20px]",
          NAV_SKELETON_PULSE_CLASS,
        )}
      />
      <div className="flex flex-1 flex-col justify-center space-y-2">
        <div
          className={cn(
            "skeleton-block h-4 w-52 rounded-full",
            NAV_SKELETON_PULSE_CLASS,
          )}
        />
        <div
          className={cn(
            "skeleton-block h-3 w-80 rounded-full",
            NAV_SKELETON_PULSE_CLASS,
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
  item?: NavItem;
  link?: NavItem;
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
        <NavSurfaceShell
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
        </NavSurfaceShell>
      </div>
    </div>
  );
}

function SurfaceItemContent({
  item: propItem,
  link,
}: {
  item?: NavItem;
  link?: NavItem;
}) {
  const item = (propItem ?? link)!;
  const surfaceStackEntries = item.surfaceStackEntries?.length
    ? item.surfaceStackEntries
    : [item];
  return (
    <>
      {surfaceStackEntries.map((surface: any) => (
        <SurfaceStackItemContent
          key={surface.surfaceId ?? "nav-surface"}
          item={item}
          surface={surface}
          isActive={surface.surfaceId === item.surfaceId}
        />
      ))}
    </>
  );
}

export interface NavCardHeaderProps {
  item?: NavItem;
  link?: NavItem;
  activeItem?: NavItem | null;
  itemStyle: any;
  badge?: NavBadgeState;
  showVideoIcon?: boolean;
  isPlaying?: boolean;
  effectiveIconOverlay?: NavIconOverlayConfig | null;
  isIconInteractive?: boolean;
  handleIconClick?: (event: any) => void;
  description?: string | null;
  isTop?: boolean;
  contextCommands?: any[];
}

export const NavCardHeader = memo(function NavCardHeader({
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
}: NavCardHeaderProps) {
  const item = (propItem ?? link)!;
  const headerKey = useMemo(
    () => resolveNavHeaderKey({ link: item, description, showVideoIcon }),
    [description, item, showVideoIcon],
  );

  return (
    <div className="relative min-h-[48px] w-full">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={headerKey}
          variants={navHeaderSwapVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={NAV_HEADER_SWAP_TRANSITION}
          className="relative flex w-full items-center gap-2.5"
          style={{ ...NAV_COMPOSITOR_STYLE }}
        >
          <div className="center relative shrink-0">
            {item.icon ? (
              <NavIcon
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
                <NavTitle
                  animated={false}
                  text={item.title || item.name}
                  style={{
                    ...itemStyle.title,
                    className: cn(itemStyle.title?.className, "text-base"),
                  }}
                />
              </div>
              <NavDescription
                animated={false}
                text={description}
                style={itemStyle.description}
              />
            </div>
            {isTop && !item.isStatus ? (
              <NavCommandBar
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
  item?: NavItem;
  link?: NavItem;
  activeItem?: NavItem | null;
  isTop?: boolean;
  itemStyle: any;
  badge?: NavBadgeState;
  isActive?: boolean;
  footerNode?: ReactNode;
  isHudActive?: boolean;
  hud?: NavHudDescriptor | null;
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
    <AnimatePresence mode="wait" initial={false}>
      {isTop && isHudActive ? (
        <motion.div
          key={`nav-hud:${hud?.id || "active"}`}
          variants={navHudVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={NAV_HUD_TRANSITION}
          style={NAV_COMPOSITOR_STYLE}
          className="relative flex w-full items-center justify-between"
        >
          <NavHudView
            clearHud={clearHud || undefined}
            hud={hud}
            pathname={pathname}
          />
        </motion.div>
      ) : (
        <motion.div
          key="nav-standard-content"
          variants={navFadeVariants}
          initial={false}
          animate="visible"
          exit="exit"
          transition={NAV_TEXT_ENTER_TRANSITION}
          style={NAV_COMPOSITOR_STYLE}
          className="relative flex h-auto w-full flex-col gap-2.5"
        >
          <NavCardHeader
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
              key="nav-surface-footer"
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

export interface NavCardItemProps {
  ref?: React.Ref<HTMLDivElement>;
  activeItem?: NavItem | null;
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
  item?: NavItem;
  link?: NavItem;
  isActive?: boolean;
  statusStyle?: any;
  isStatusActive?: boolean;
  isHudActive?: boolean;
  isSurfaceActive?: boolean;
  hud?: NavHudDescriptor | null;
  clearHud?: ((id?: string) => void) | null;
  contextCommands?: any[];
}

export const NavCardItem = memo(function NavCardItem({
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
}: NavCardItemProps) {
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
      activeItem?.surfacePhase !== NAV_SURFACE_PHASE.RESTORING_HEADER,
    ),
  );
  const isHeaderRestoring =
    item.surfacePhase === NAV_SURFACE_PHASE.RESTORING_HEADER;
  const showVideoScrubber = Boolean(
    isTop &&
    isVideo &&
    (!item.isSurface || isHeaderRestoring) &&
    !item.isStatus,
  );

  const badge = useNavBadge(item.name?.toLowerCase(), item.badge);
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
      resolveNavVisualStyle(effectiveStyle, {
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
      resolveNavigationRoutePolicy({ href: item.path ?? "", item }).prefetch &&
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
      resolveNavigationRoutePolicy({ href: targetHref ?? "", item }).prefetch &&
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
  const {
    className: cardClassName,
    style: cardStyle,
    motionValues,
  } = getNavItemCardProps({
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
    () => getNavCardDelay({ expanded, isStackHovered, position }),
    [expanded, isStackHovered, position],
  );

  return (
    <motion.div
      ref={ref}
      className={cardClassName}
      data-controls-anchor={isTop ? "true" : undefined}
      style={cardStyle}
      initial={
        restoreFromCompact && position > 0
          ? getNavItemCompactRestoreValues({ motionValues, position })
          : false
      }
      animate={getNavItemAnimateValues({
        motionValues,
        expanded,
        isStackHovered,
        isSurfaceActive,
        position,
      })}
      transition={getNavItemTransition({
        expanded,
        isStackHovered,
        isRestoringDeck: restoreFromCompact,
        isCompactingDeck:
          isCompacting || (globalCompact && !restoreFromCompact),
        position,
        delay: cardDelay,
      })}
      whileTap={
        !item.isOverlay && !item.isStatus
          ? { scale: (motionValues?.scale || 1) * NAV_TAP_SCALE }
          : undefined
      }
      exit={getNavItemCompactExitValues({ motionValues, position })}
      role={hasNestedInteractiveContent ? "group" : "button"}
      aria-label={
        compact
          ? `${item.title || item.name || "Navigation item"}; click again to expand navigation`
          : undefined
      }
      title={compact ? "Click again to expand navigation" : undefined}
      tabIndex={item.isOverlay || item.isStatus ? -1 : 0}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onScroll={handleScroll}
      onClick={onClick}
    >
      <NavCardBanner
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

      {showVideoScrubber && <NavMediaScrubber />}

      <AnimatePresence>
        {compact && (
          <motion.div
            key="compact-title-overlay"
            variants={navCompactTitleVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-[38px] items-center justify-center px-4"
          >
            <div className="min-w-0">
              <NavTitle
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
          isExtensionShelf && "min-h-[140px]",
        )}
        animate={getNavCardContentAnimateProps({
          compact,
          expanded,
          position,
          isExtensionShelf,
        })}
        transition={getNavCardContentTransition({
          compact,
          isRestoringFromCompact: restoreFromCompact,
        })}
        style={{
          ...NAV_COMPOSITOR_STYLE,
          pointerEvents:
            compact || (!expanded && position > 0 && !isExtensionShelf)
              ? "none"
              : "auto",
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {item.isSurface &&
          item.surfacePhase !== NAV_SURFACE_PHASE.DISMISSING_ACTION &&
          item.surfacePhase !== NAV_SURFACE_PHASE.RESTORING_HEADER ? (
            <motion.div
              key="surface-content-layer"
              variants={navHeaderSwapVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={NAV_HEADER_SWAP_TRANSITION}
              style={NAV_COMPOSITOR_STYLE}
              className="w-full overflow-hidden rounded-[20px]"
            >
              <SurfaceItemContent item={item} />
            </motion.div>
          ) : isExtensionShelf ? (
            <motion.div
              key="extension-shelf-layer"
              variants={navExtensionShelfVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={NAV_HEADER_SWAP_TRANSITION}
              style={NAV_COMPOSITOR_STYLE}
              className="relative flex h-[43px] w-full items-center justify-between"
            >
              <NavSurfaceExtensionsBar activeItem={activeItem} />
            </motion.div>
          ) : (
            <motion.div
              key="standard-content-layer"
              variants={navHeaderRestoreVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={NAV_HEADER_SWAP_TRANSITION}
              style={NAV_COMPOSITOR_STYLE}
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
                        NAV_SURFACE_PHASE.DISMISSING_ACTION ? (
                          <motion.div
                            key="nav-action-component-dismiss"
                            variants={navActionDismissVariants}
                            initial="visible"
                            animate="exit"
                            exit="exit"
                            transition={NAV_ACTION_DISMISS_TRANSITION}
                            className="flow-root overflow-visible"
                            style={{ overflow: "visible" }}
                            onClick={stopPropagationOnly}
                          >
                            <Suspense>{renderedActionNode}</Suspense>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="nav-action-component"
                            variants={textCrossfadeVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={NAV_FADE_TRANSITION}
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
