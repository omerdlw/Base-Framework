import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import { defineTheme } from "@omerdlw/base-framework/theme";
import { controlsTheme } from "@omerdlw/base-framework/modules/controls";

export const controlsThemeConfig = defineTheme(controlsTheme, {
  slots: {
    rail: "pointer-events-none fixed hidden w-max max-w-[calc(100vw-8px)] sm:block",
    stack:
      "pointer-events-auto flex w-max max-w-full flex-col-reverse gap-y-1 data-[side=left]:items-end data-[side=right]:items-start",
  },
  styles: {
    rail: { zIndex: Z_INDEX.DOCK },
  },
});
