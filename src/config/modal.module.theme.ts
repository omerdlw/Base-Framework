import { Z_INDEX } from "@/core/tokens";
import { defineTheme } from "@/modules/theme";
import { modalTheme } from "@/modules/modal";

export const modalThemeConfig = defineTheme(modalTheme, {
  slots: {
    backdrop: "fixed inset-0 cursor-pointer bg-black/60 backdrop-blur-md",
    dim: "pointer-events-auto absolute inset-0 cursor-pointer bg-black/30 backdrop-blur-[2px] transition-all duration-base ease-in-out-cubic",

    layer: "pointer-events-none fixed inset-0 flex flex-col",
    layerCenterDesktop: "px-3",
    positionCenter: "items-center justify-center",
    positionTop: "items-center justify-start",
    positionBottom: "items-center justify-end",
    positionLeft: "items-start justify-start",
    positionRight: "items-end justify-start",

    frame: "relative flex max-w-full flex-col",
    frameActive: "pointer-events-auto",
    frameInactive: "pointer-events-none select-none",
    frameCenter: "w-full sm:w-auto",
    frameVerticalEdge: "w-full self-stretch",
    frameSideMobile: "w-full self-stretch",
    frameSideDesktop: "w-auto",

    panel: "modal-panel relative flex flex-col",
    panelChrome:
      "overflow-hidden bg-black/60 shadow-[0_18px_56px_rgba(0,0,0,0.50)] ring-1 ring-white/10 backdrop-blur-lg ring-inset",
    panelBare:
      "overflow-visible bg-transparent ring-1 ring-transparent ring-inset",
    radiusCenter: "rounded-[30px]",
    radiusTop: "rounded-b-[30px]",
    radiusBottom: "rounded-t-[30px]",
    radiusLeft: "rounded-r-[30px]",
    radiusRight: "rounded-l-[30px]",
    radiusSideMobile: "rounded-none",
    chromeTop: "border-t-0",
    chromeBottom: "border-b-0",
    chromeEdgeMobileTop: "w-full rounded-b-[30px] border-t-0 border-x-0",
    chromeEdgeMobileBottom: "w-full rounded-t-[30px] border-b-0 border-x-0",
    sideMobile:
      "h-screen max-h-screen w-full self-stretch rounded-none border-0",
    sideDesktop: "h-screen max-h-screen w-full",
    sideLeft: "border-l-0",
    sideRight: "border-r-0",

    switcher: "center shrink-0 gap-2 border-t border-white/10 bg-white/5 p-2.5",
    switcherButton:
      "flex cursor-pointer items-center gap-1.5 rounded-xl bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white/70 uppercase ring-1 ring-white/5 ring-inset hover:bg-white hover:text-black",
    switcherIcon: "shrink-0",
    switcherDivider: "text-xs text-white/15",
    switcherCurrent:
      "rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-bold uppercase ring-1 ring-white/10 ring-inset",

    container: "flex min-h-0 flex-col overflow-hidden",
    containerSide: "h-full max-h-full",
    containerMaxHeight: "max-h-[70dvh]",
    body: "modal-body min-h-0 w-full flex-1 overflow-y-auto overscroll-contain rounded-[20px]",
    slotRowGrid: "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]",
    slotRowFlex: "flex justify-between",
    slotRowLayout: "items-center gap-2.5 px-4 py-3",
    slotStart: "min-w-0",
    slotCenter: "flex items-center justify-center",
    slotEnd: "min-w-0",
    stickyHeader: "sticky top-0 bg-black/80 backdrop-blur-md",
    stickyFooter: "sticky bottom-0 bg-black/80 backdrop-blur-md",
    footerEnd: "flex items-center gap-2.5",
    footerEndWithCenter: "w-full justify-end",
    title: "truncate text-sm font-semibold text-white",
    headerActions: "flex items-center justify-end gap-2.5",
    closeButton:
      "center inline-flex size-8 cursor-pointer rounded-[20px] bg-white/5 text-white/70 ring-1 ring-white/5 ring-inset hover:bg-white hover:text-black hover:ring-transparent active:scale-95 transition-all ease-out-quart duration-micro focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:outline-none",
  },
  styles: {
    backdrop: { zIndex: Z_INDEX.MODAL_BACKDROP },
    dim: { zIndex: Z_INDEX.MODAL_BACKDROP },
    stickyHeader: { zIndex: Z_INDEX.MODAL_STICKY_HEADER },
  },
});
