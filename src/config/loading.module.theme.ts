import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import { defineTheme } from "@omerdlw/base-framework/theme";
import { loadingTheme } from "@omerdlw/base-framework/modules/loading";

export const loadingThemeConfig = defineTheme(loadingTheme, {
  slots: {
    overlay: "center fixed inset-0 h-screen w-screen",
  },
  styles: {
    overlay: { zIndex: Z_INDEX.LOADING },
  },
});
