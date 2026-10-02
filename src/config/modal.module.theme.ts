import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import { defineTheme } from "@omerdlw/base-framework/theme";
import { modalTheme } from "@omerdlw/base-framework/modules/modal";

/**
 * Class map for `src/modules/modal`. Variants are `data-*` modifiers:
 * - `data-position` (layer): center | top | bottom | left | right
 * - `data-layout` (frame, panel): center | top | bottom | left | right |
 *   top-mobile | bottom-mobile | side-mobile
 * - `data-active` (frame), `data-height` (content), `data-columns` and
 *   `data-sticky` (row).
 */
export const modalThemeConfig = defineTheme(modalTheme, {
  slots: {
    // Full-screen layers behind the dialogs
    backdrop: "fixed inset-0 cursor-pointer bg-black/60 backdrop-blur-md",
    dim: "pointer-events-auto absolute inset-0 cursor-pointer bg-black/30 backdrop-blur-[2px] transition-all duration-base ease-in-out-cubic",

    // Dialog placement
    layer: [
      "pointer-events-none fixed inset-0 flex flex-col data-[inset=true]:px-3",
      "data-[position=center]:items-center data-[position=center]:justify-center",
      "data-[position=top]:items-center data-[position=top]:justify-start",
      "data-[position=bottom]:items-center data-[position=bottom]:justify-end",
      "data-[position=left]:items-start data-[position=left]:justify-start",
      "data-[position=right]:items-end data-[position=right]:justify-start",
    ].join(" "),
    frame: [
      "pointer-events-none relative flex max-w-full flex-col select-none data-[active=true]:pointer-events-auto data-[active=true]:select-auto",
      "data-[layout=center]:w-full sm:data-[layout=center]:w-auto",
      "data-[layout=left]:w-auto data-[layout=right]:w-auto",
      "data-[layout=top]:w-full data-[layout=top]:self-stretch data-[layout=top-mobile]:w-full data-[layout=top-mobile]:self-stretch",
      "data-[layout=bottom]:w-full data-[layout=bottom]:self-stretch data-[layout=bottom-mobile]:w-full data-[layout=bottom-mobile]:self-stretch",
      "data-[layout=side-mobile]:w-full data-[layout=side-mobile]:self-stretch",
    ].join(" "),

    // Dialog surface — panelChrome shapes itself per data-layout, panelBare is flat
    panel: "modal-panel relative flex flex-col",
    panelBare:
      "overflow-visible bg-transparent ring-1 ring-transparent ring-inset",
    panelChrome: [
      "overflow-hidden bg-black/60 shadow-[0_18px_56px_rgba(0,0,0,0.50)] ring-1 ring-inset ring-white/10 backdrop-blur-lg",
      "data-[layout=center]:rounded-[30px]",
      "data-[layout=top]:rounded-b-[30px] data-[layout=top]:border-t-0",
      "data-[layout=bottom]:rounded-t-[30px] data-[layout=bottom]:border-b-0",
      "data-[layout=top-mobile]:w-full data-[layout=top-mobile]:rounded-b-[30px] data-[layout=top-mobile]:border-x-0 data-[layout=top-mobile]:border-t-0",
      "data-[layout=bottom-mobile]:w-full data-[layout=bottom-mobile]:rounded-t-[30px] data-[layout=bottom-mobile]:border-x-0 data-[layout=bottom-mobile]:border-b-0",
      "data-[layout=left]:h-screen data-[layout=left]:max-h-screen data-[layout=left]:w-full data-[layout=left]:rounded-r-[30px] data-[layout=left]:border-l-0",
      "data-[layout=right]:h-screen data-[layout=right]:max-h-screen data-[layout=right]:w-full data-[layout=right]:rounded-l-[30px] data-[layout=right]:border-r-0",
      "data-[layout=side-mobile]:h-screen data-[layout=side-mobile]:max-h-screen data-[layout=side-mobile]:w-full data-[layout=side-mobile]:self-stretch data-[layout=side-mobile]:rounded-none data-[layout=side-mobile]:border-0",
    ].join(" "),

    // ModalContainer — content reads data-height: full | capped
    content:
      "flex min-h-0 flex-col overflow-hidden data-[height=capped]:max-h-[70dvh] data-[height=full]:h-full data-[height=full]:max-h-full",
    body: "modal-body min-h-0 w-full flex-1 overflow-y-auto overscroll-contain rounded-[20px]",

    // Header and footer rows — data-columns: 2 | 3, data-sticky: top | bottom
    row: "items-center gap-2.5 px-4 py-3 data-[columns=2]:flex data-[columns=2]:justify-between data-[columns=3]:grid data-[columns=3]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] data-[sticky]:bg-black/80 data-[sticky]:backdrop-blur-md data-[sticky=bottom]:sticky data-[sticky=bottom]:bottom-0 data-[sticky=top]:sticky data-[sticky=top]:top-0",
    rowCenter: "flex items-center justify-center",
    rowEnd: "flex min-w-0 items-center justify-end gap-2.5",
    rowStart: "min-w-0",
    title: "truncate text-sm font-semibold text-white",
    closeButton:
      "center inline-flex size-8 cursor-pointer rounded-[20px] bg-white/5 text-white/70 ring-1 ring-white/5 ring-inset hover:bg-white hover:text-black hover:ring-transparent active:scale-95 transition-all ease-out-quart duration-micro",

    // Back-to-previous-modal switcher
    switcher: "center shrink-0 gap-2 border-t border-white/10 bg-white/5 p-2.5",
    switcherButton:
      "flex cursor-pointer items-center gap-1.5 rounded-xl bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white/70 uppercase ring-1 ring-white/5 ring-inset *:shrink-0 hover:bg-white hover:text-black",
    switcherCurrent:
      "rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-bold uppercase ring-1 ring-white/10 ring-inset",
    switcherDivider: "text-xs text-white/15",
  },
  styles: {
    backdrop: { zIndex: Z_INDEX.MODAL_BACKDROP },
    dim: { zIndex: Z_INDEX.MODAL_BACKDROP },
    row: { zIndex: Z_INDEX.MODAL_STICKY_HEADER },
  },
});
