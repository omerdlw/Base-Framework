import { errorTheme } from "@/core/error";
import { defineTheme } from "@/core/theme";

export const errorThemeConfig = defineTheme(errorTheme, {
  slots: {
    container: "w-screen h-screen flex flex-col gap-2.5 center bg-red-500/10",
    iconBox:
      "bg-white/5 text-white flex size-12 items-center justify-center rounded-full text-xl font-bold",
    title: "text-lg font-semibold",
    button:
      "bg-red-900/50 cursor-pointer hover:bg-white hover:text-black px-5 py-2.5 text-xs font-medium text-white rounded-full transition-all duration-base ease-in-out-cubic",
  },
});
