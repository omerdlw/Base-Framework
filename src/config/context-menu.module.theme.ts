import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import { defineTheme } from "@omerdlw/base-framework/theme";
import { contextMenuTheme } from "@omerdlw/base-framework/modules/context-menu";

export const contextMenuThemeConfig = defineTheme(contextMenuTheme, {
  slots: {
    backdrop: "fixed inset-0",
    menu: "max-w-sm min-w-64 overflow-hidden rounded-[24px] bg-black/80 shadow-[0_18px_56px_rgba(0,0,0,0.50)] ring-1 ring-white/10 backdrop-blur-lg ring-inset",
    header:
      "mb-2 flex items-center gap-2.5 border-b border-white/10 px-1 pb-2.5",
    headerIcon:
      "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[14px] ring-1 ring-inset ring-white/10 bg-white/5 bg-cover bg-center bg-no-repeat text-white/70",
    headerText: "h-full w-full min-w-0 space-y-0.5",
    headerEyebrow: "text-xs font-semibold text-white/50 uppercase",
    headerTitle: "truncate text-sm leading-tight font-semibold text-white",
    headerDescription: "text-xs leading-snug text-white/70",
    separator: "mx-1 my-1.5 h-px bg-white/10",
    item: "group flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium text-white/70 transition-all duration-micro ease-in-out-cubic hover:bg-white/10 hover:text-white data-[active=true]:bg-white/10 data-[active=true]:text-white disabled:pointer-events-none disabled:opacity-50",
    itemIcon:
      "shrink-0 text-white/50 transition-all duration-base ease-in-out-cubic group-hover:text-white/70",
    itemLabel: "grow truncate",
    itemShortcut:
      "ml-2 shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 text-xs text-white/50 uppercase ring-1 ring-white/10 ring-inset",
  },
  styles: {
    backdrop: { zIndex: Z_INDEX.CONTEXT_MENU_BACKDROP },
    menu: { padding: 10, zIndex: Z_INDEX.CONTEXT_MENU },
  },
});
