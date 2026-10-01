import { primitivesTheme } from "@/core/primitives";
import { defineTheme } from "@/core/theme";

const DISABLED = "disabled:cursor-not-allowed disabled:opacity-50";

export const primitivesThemeConfig = defineTheme(primitivesTheme, {
  slots: {
    avatar: "rounded-full",
    avatarFallback: "text-xs font-medium uppercase",
    badge: "rounded-full px-2.5 py-0.5 text-xs font-medium",
    button:
      "disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-white",
    checkbox: `h-5 w-5 rounded-md ${DISABLED}`,
    input: DISABLED,
    progress: "h-2 rounded-full bg-current/10",
    progressIndicator: "rounded-full bg-current",
    selectCheck: "text-white",
    selectChevron: "text-white/50",
    selectContent:
      "mt-1.5 max-h-64 rounded-2xl bg-black/90 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.55)] ring-1 ring-white/10 backdrop-blur-xl ring-inset",
    selectEmpty: "px-3 py-2 text-center text-xs text-white/45",
    selectLabel: "text-xs font-medium text-white/75",
    selectOption: "rounded-xl px-3 py-2 text-sm text-white/85",
    selectOptionActive: "bg-white/10 text-white",
    selectOptionDescription: "text-xs text-white/50",
    selectOptionDisabled: "opacity-40",
    selectOptionIcon: "text-white/75",
    selectOptionSelected: "font-medium text-white",
    selectPlaceholder: "text-white/45",
    selectTrigger:
      "rounded-xl bg-white/5 px-3.5 py-2.5 text-sm text-white ring-1 ring-white/10 ring-inset hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45",
    separator: "bg-current/10",
    skeleton: "rounded-lg",
    switch: `h-6 w-11 rounded-full p-0.5 ${DISABLED}`,
    switchThumb: "h-5 w-5 rounded-full bg-current",
    switchThumbOff: "translate-x-0",
    switchThumbOn: "translate-x-5",
    textarea: DISABLED,
  },
});
