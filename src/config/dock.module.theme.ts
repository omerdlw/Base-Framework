import type { CSSProperties } from "react";
import { Z_INDEX } from "@/core/tokens";
import { defineTheme } from "@/modules/theme";
import { dockTheme } from "@/modules/dock";

const toLeft = (gradient: string) =>
  gradient
    .replaceAll("to right", "to left")
    .replace(/at (\d+)%/g, (_, x) => `at ${100 - Number(x)}%`);

const BANNER_SHARP_MASK =
  "radial-gradient(ellipse 72% 170% at 82% 42%, black 0%, black 32%, rgba(0,0,0,0.7) 52%, rgba(0,0,0,0.25) 74%, transparent 100%), linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, black 28%, black 72%, rgba(0,0,0,0.7) 100%), linear-gradient(to right, black 0%, black 68%, rgba(0,0,0,0.55) 100%)";

const BANNER_SCRIM =
  "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 45%), linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 28%, rgba(0,0,0,0.1) 52%, transparent 66%, rgba(0,0,0,0.12) 76%, rgba(0,0,0,0.38) 100%)";

const CONTROL_BUTTON =
  "center size-9 backdrop-blur-lg shrink-0 cursor-pointer bg-black/60 text-white/70 ring-1 ring-white/10 ring-inset hover:bg-white/10 hover:text-white hover:ring-white/15 motion-safe:active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:bg-white/10 focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/15 focus-visible:outline-none transition-[background-color,color,border-color,border-radius,transform] duration-micro ease-out-quart";

const MEDIA_ICON_BUTTON =
  "center size-8 cursor-pointer rounded-full bg-white/5 text-white/70 ring-1 ring-white/5 ring-inset transition-colors duration-micro ease-out-quart hover:bg-white/10 hover:text-white hover:ring-white/10 focus-visible:bg-white/10 focus-visible:text-white focus-visible:ring-white/10 focus-visible:outline-none select-none";

const SURFACE = "bg-black/60 ring-1 ring-inset ring-white/10";

export const dockThemeConfig = defineTheme(dockTheme, {
  slots: {
    stack:
      "@container fixed inset-x-0 bottom-1 mx-auto touch-manipulation select-none",
    backdrop: "fixed inset-0 cursor-pointer bg-black/60 backdrop-blur-sm",

    card: "group @container absolute h-auto w-full overflow-hidden ring-1 ring-inset ring-white/10 bg-black/60 rounded-[30px] transition-colors duration-micro ease-out-quart",
    cardPadded: "p-2.5",
    cardShelf: "px-1.5 py-0",
    cardBlurHeavy: "backdrop-blur-lg",
    cardBlurLight: "backdrop-blur-sm",
    cardTop: "inset-0 h-full",
    cardAnchoredBottom: "bottom-0",
    cardFloating: "top-0",
    cardAnchored: "cursor-default",
    cardClickable: "cursor-pointer",
    cardGhost: "pointer-events-none select-none",
    cardContent: "flow-root w-full overflow-hidden",
    cardContentShelf: "min-h-[96px]",
    surfaceLayer: "w-full overflow-hidden rounded-[20px]",
    shelfLayer: "relative flex h-[45px] w-full items-center justify-between",
    standardLayer: "w-full",
    actionLayer: "flow-root overflow-visible",
    actionStack: "flex flex-col gap-2.5",
    hudLayer: "relative flex w-full items-center justify-between",
    contentLayer: "relative flex h-auto w-full flex-col gap-2.5",
    footer: "relative w-full overflow-visible",
    hidden: "hidden",

    bannerRoot:
      "pointer-events-none absolute inset-0 overflow-hidden select-none",
    bannerSharpImage:
      "absolute inset-0 transition-transform duration-moderate ease-out-quart motion-safe:group-hover:scale-[1.025]",
    bannerScrim: "pointer-events-none absolute inset-0",

    header: "relative min-h-[48px] w-full",
    headerRow: "relative flex w-full items-center gap-2.5",
    headerIcon: "center relative shrink-0",
    headerIconEmpty: "size-12",
    headerBody:
      "relative flex w-full flex-1 items-center justify-between gap-2.5 overflow-hidden",
    headerText:
      "flex h-full min-w-0 flex-1 flex-col justify-center -space-y-0.5",
    headerTitleRow: "flex items-center gap-1.5",
    headerTitle: "text-base",

    title: "truncate font-bold",
    titleWrap: "relative overflow-hidden",
    description: "relative min-h-[1.25rem] w-full overflow-hidden text-sm",
    descriptionText: "text-white",
    descriptionMultiline: "wrap-break-word whitespace-normal",
    descriptionSingleLine: "truncate",

    icon: "relative size-12 shrink-0",
    iconMotion: "size-full",
    iconImage:
      "size-12 shrink-0 rounded-[20px] bg-cover bg-center bg-no-repeat",
    iconGlyph:
      "center size-12 shrink-0 rounded-[20px] bg-white/5 text-white transition-colors duration-micro ease-out-quart hover:bg-white/10",
    iconGlyphInner: "center shrink-0",
    iconButton: "size-full cursor-pointer p-0 focus:outline-none select-none",
    iconOverlay:
      "center absolute -end-1.5 -bottom-1.5 size-6 overflow-hidden rounded-full",
    iconOverlayInteractive: "cursor-pointer",
    iconOverlayStatic: "cursor-default",
    iconOverlayImage:
      "size-full rounded-full bg-cover bg-center bg-no-repeat ring-1 ring-inset ring-white/10",
    iconOverlayGlyph: "center text-white",
    badge:
      "center absolute -end-1 -bottom-1 size-6 overflow-hidden rounded-full bg-black text-[11px] leading-none font-bold tabular-nums text-white ring-2 ring-black",

    commandBar: "flex shrink-0 items-center",
    commandTooltip:
      "rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-black",
    command:
      "center relative size-8 cursor-pointer rounded-full bg-transparent text-white/70 transition-[background-color,color,backdrop-filter] duration-micro ease-out-quart hover:text-white select-none",
    commandOnBanner:
      "hover:bg-white/10 hover:backdrop-blur-md focus-visible:bg-white/10 focus-visible:backdrop-blur-md",
    commandPlain: "hover:bg-white/5",
    commandBadge:
      "center bg-white absolute right-1.5 top-1.5 size-3 rounded-full text-[10px] leading-none font-bold tabular-nums text-black",

    statusCard: SURFACE,
    statusIcon: "bg-white/10 text-white",
    statusTitle: "text-white",
    statusDescription: "text-white/70",

    surfaceShell:
      "@container relative flex flex-col overflow-hidden rounded-[20px]",
    surfaceBody: "@container w-full overflow-hidden rounded-[20px]",
    surfaceStack: "@container relative w-full overflow-hidden rounded-[20px]",
    surfaceStackInner: "w-full",
    surfaceContent: "w-full",
    controls:
      "pointer-events-none absolute inset-x-0 bottom-[calc(100%+14px)] select-none flex items-center justify-center gap-[2px]",
    controlAction:
      "pointer-events-auto flex shrink-0 items-center overflow-hidden",
    controlBack: "pointer-events-auto shrink-0 overflow-hidden",
    controlClose: "pointer-events-auto shrink-0",
    controlButton: CONTROL_BUTTON,
    controlBackIcon: "rtl:rotate-180",
    controlRadiusSingle: "rounded-full",
    controlRadiusFirst: "rounded-s-full rounded-e-none",
    controlRadiusLast: "rounded-e-full rounded-s-none",
    controlRadiusMiddle: "rounded-none",
    headerButton: `pointer-events-auto ${CONTROL_BUTTON} disabled:opacity-50 disabled:pointer-events-none`,
    headerButtonText: "h-9 px-3.5 text-xs font-semibold whitespace-nowrap",

    extensions:
      "relative flex h-full w-full items-center justify-between select-none",
    extensionsLeft:
      "pointer-events-auto flex h-full items-center justify-start gap-1",
    extensionsLeftFill: "w-full min-w-0 flex-1",
    extensionsLeftShrink: "shrink-0",
    extensionsCenterLayer:
      "pointer-events-none absolute inset-0 flex items-center justify-center",
    extensionsCenter:
      "pointer-events-auto flex items-center justify-center gap-1",
    extensionsCenterFill: "w-full",
    extensionsRight:
      "pointer-events-auto ms-auto flex h-full shrink-0 items-center justify-end gap-1",
    extensionPill:
      "pointer-events-auto flex min-h-6 h-full max-w-full items-center gap-1 select-none",
    extensionPillFill: "w-full min-w-0 flex-1 justify-center",
    extensionBare: "pointer-events-auto",
    extensionBareFill: "w-full min-w-0 flex-1",

    scrubber:
      "group absolute inset-x-0 top-0 h-3 cursor-pointer touch-none overflow-hidden rounded-t-[30px] select-none",
    scrubberTrack:
      "absolute inset-x-0 top-0 h-1 w-full origin-top scale-y-[0.625] transform-gpu bg-white/10 transition-transform duration-micro ease-out-quart motion-safe:group-hover:scale-y-100",
    scrubberProgress:
      "h-full w-full origin-left bg-white/70 group-hover:bg-white",
    scrubberTooltip:
      "pointer-events-none absolute top-3 -translate-x-1/2 rounded-[8px] bg-black/80 px-2 py-0.5 text-xs font-medium tabular-nums text-white ring-1 ring-white/10 ring-inset",

    media: "flex w-full items-center justify-between gap-2 select-none",
    mediaGroup: "flex items-center gap-1.5",
    mediaSpeed:
      "center h-8 cursor-pointer rounded-full px-3 text-xs font-semibold tabular-nums ring-1 ring-inset transition-colors duration-micro ease-out-quart select-none focus-visible:outline-none",
    mediaSpeedActive:
      "bg-white/10 text-white ring-white/10 hover:bg-white/15 hover:ring-white/15 focus-visible:bg-white/15 focus-visible:ring-white/15",
    mediaSpeedIdle:
      "bg-white/5 text-white/70 ring-white/5 hover:bg-white/10 hover:text-white hover:ring-white/10 focus-visible:bg-white/10 focus-visible:text-white focus-visible:ring-white/10",
    mediaSkip: MEDIA_ICON_BUTTON,
    mediaVolume:
      "group flex h-8 items-center gap-1.5 rounded-full px-2.5 ring-1 transition-colors duration-micro ease-out-quart select-none ring-inset",
    mediaVolumeActive: "bg-white/10 ring-white/10",
    mediaVolumeIdle:
      "bg-white/5 ring-white/5 hover:bg-white/10 hover:ring-white/10",
    mediaMute:
      "center size-5 cursor-pointer p-0 text-white/70 transition-colors duration-micro ease-out-quart hover:text-white",
    mediaVolumeTrack:
      "group/track relative flex h-6 w-16 cursor-pointer touch-none items-center select-none sm:w-20",
    mediaVolumeRail:
      "relative h-1.5 w-full overflow-hidden rounded-full bg-white/10",
    mediaVolumeFill: "h-full origin-left rounded-full bg-white",
    mediaVolumeThumb:
      "pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-md ring-2 ring-black",
    mediaVolumeThumbActive: "opacity-100",
    mediaVolumeThumbIdle: "opacity-0 group-hover/track:opacity-100",
    mediaToggle:
      "flex size-8 cursor-pointer items-center justify-center rounded-full ring-1 ring-inset select-none",
    mediaToggleActive: "bg-white/10 text-white ring-white/10 hover:bg-white/15",
    mediaToggleIdle:
      "bg-white/5 text-white/70 ring-white/5 hover:bg-white/10 hover:text-white hover:ring-white/10",

    breadcrumbs:
      "absolute inset-x-0 top-[calc(100%+4px)] flex h-[40px] w-full items-center justify-center rounded-[20px] bg-black/60 px-4 text-xs ring-1 ring-white/10 select-none ring-inset backdrop-blur-lg",
    breadcrumbsNav: "flex scrollbar-none items-center gap-1.5 overflow-x-auto",
    breadcrumbsEllipsis: "px-0.5 text-white/50 select-none",
    breadcrumbsItem: "flex items-center gap-1.5",
    breadcrumbsCurrent: "max-w-[180px] truncate font-medium text-white",
    breadcrumbsLink:
      "max-w-[140px] truncate text-white/70 transition-colors duration-micro ease-out-quart hover:text-white",
    breadcrumbsSeparator: "center shrink-0 text-white/50 rtl:rotate-180",

    loading: "flex min-h-[48px] w-full items-center gap-2.5",
    loadingIcon: "skeleton-block size-12 shrink-0 rounded-[20px]",
    loadingText: "flex min-w-0 flex-1 flex-col justify-center gap-1.5",
    loadingTitle: "skeleton-block h-3.5 w-36 max-w-[60%] rounded-full",
    loadingDescription: "skeleton-block h-3 w-56 max-w-[85%] rounded-full",

    action:
      "center h-10 w-full rounded-[20px] gap-2 px-4 text-xs font-semibold uppercase cursor-pointer select-none transition-[background-color,color,border-color,transform] duration-micro ease-out-quart motion-safe:active:scale-[0.97] motion-reduce:active:scale-100",
    actionMuted:
      "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white",
    actionActive:
      "bg-white/10 text-white hover:bg-white/15 focus-visible:bg-white/15",
    actionToneMuted:
      "bg-white/5 text-white/70 hover:text-white hover:bg-white/10 focus-visible:bg-white/10 focus-visible:text-white",
    actionToneActive:
      "bg-white/10 text-white hover:bg-white/15 focus-visible:bg-white/15",
    actionTone: "bg-primary/10 text-primary hover:bg-primary hover:text-black",
    actionRow: "flex w-full items-center gap-2.5",
    actionFill: "min-w-0 flex-1 justify-center whitespace-nowrap",
    actionLabel: "truncate",
    surface: SURFACE,
  },
  styles: {
    stack: {
      zIndex: Z_INDEX.DOCK,
      maxWidth: "100vw",
      contain: "layout",
      borderRadius: 30,
    },
    backdrop: { zIndex: Z_INDEX.DOCK_BACKDROP },
    footer: { zIndex: Z_INDEX.DOCK_CARD_CONTENT },
    actionLayer: { overflow: "visible" },
    bannerRoot: { zIndex: Z_INDEX.DOCK_CARD_BACKGROUND },
    bannerSharpImage: {
      "--dock-banner-mask-ltr": BANNER_SHARP_MASK,
      "--dock-banner-mask-rtl": toLeft(BANNER_SHARP_MASK),
    } as CSSProperties,
    bannerScrim: {
      "--dock-banner-scrim-ltr": BANNER_SCRIM,
      "--dock-banner-scrim-rtl": toLeft(BANNER_SCRIM),
    } as CSSProperties,
    badge: { zIndex: Z_INDEX.DOCK_CARD_BADGE },
    iconOverlay: { zIndex: Z_INDEX.DOCK_CARD_BADGE },
    scrubber: { zIndex: Z_INDEX.DOCK_CARD_MEDIA },
    controls: { zIndex: Z_INDEX.DOCK_SURFACE_POPOVER },
    controlButton: { zIndex: Z_INDEX.DOCK_SURFACE_CONTROL },
    headerButton: { zIndex: Z_INDEX.DOCK_SURFACE_CONTROL },
    extensionsLeft: { zIndex: Z_INDEX.DOCK_SURFACE_CONTROL },
    extensionsCenterLayer: { zIndex: Z_INDEX.DOCK_SURFACE_CENTER },
    extensionsRight: { zIndex: Z_INDEX.DOCK_SURFACE_CONTROL },
    breadcrumbs: { zIndex: Z_INDEX.DOCK_BREADCRUMBS },
  },
});
