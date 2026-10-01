import { Z_INDEX } from "@/core/tokens";
import { defineTheme } from "@/modules/theme";
import { loadingTheme } from "@/modules/loading";

export const loadingThemeConfig = defineTheme(loadingTheme, {
  slots: {
    overlay: "center fixed inset-0 h-screen w-screen",
  },
  styles: {
    overlay: { zIndex: Z_INDEX.LOADING },
  },
});
