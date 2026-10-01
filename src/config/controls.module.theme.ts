import { Z_INDEX } from "@/core/tokens";
import { defineTheme } from "@/modules/theme";
import { controlsTheme } from "@/modules/controls";

export const controlsThemeConfig = defineTheme(controlsTheme, {
  slots: {
    rail: "pointer-events-none fixed hidden w-max max-w-[calc(100vw-8px)] sm:block",
    railLeft: "",
    railRight: "",
    stack: "pointer-events-auto flex w-max max-w-full flex-col-reverse gap-y-1",
    stackLeft: "items-end",
    stackRight: "items-start",
  },
  styles: {
    rail: { zIndex: Z_INDEX.DOCK },
  },
});
