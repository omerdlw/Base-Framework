import { defineTheme } from "@/modules/theme";
import { ambientTheme } from "@/modules/ambient";

export const ambientThemeConfig = defineTheme(ambientTheme, {
  slots: {
    transition: "transition-colors duration-moderate ease-out-quart",
  },
});
