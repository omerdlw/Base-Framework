import { errorTheme } from "@omerdlw/base-framework/error";
import { defineTheme } from "@omerdlw/base-framework/theme";

export const errorThemeConfig = defineTheme(errorTheme, {
  slots: {
    screen: "w-screen h-screen flex flex-col gap-2.5 center bg-red-500/10",
    icon: "bg-white/5 text-white flex size-12 items-center justify-center rounded-full text-xl font-bold",
    title: "text-lg font-semibold",
    retryButton:
      "bg-red-900/50 cursor-pointer hover:bg-white hover:text-black px-5 py-2.5 text-xs font-medium text-white rounded-full transition-all duration-base ease-in-out-cubic",
  },
});
