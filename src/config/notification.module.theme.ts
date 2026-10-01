import { Z_INDEX } from "@/core/tokens";
import { defineTheme } from "@/modules/theme";
import { notificationTheme } from "@/modules/notification";

export const notificationThemeConfig = defineTheme(notificationTheme, {
  slots: {
    layer:
      "pointer-events-none fixed inset-x-0 bottom-2 mx-auto flex w-full max-w-[380px] flex-col items-center justify-center px-4",
    toast:
      "pointer-events-auto flex h-[40px] w-full cursor-pointer items-center justify-center rounded-[20px] bg-black/60 px-4 text-xs font-medium text-white ring-1 ring-white/10 select-none ring-inset backdrop-blur-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50",
    toastDocked: "absolute inset-x-0 top-[calc(100%+4px)] z-20",
    toastFloating: "",
    message: "truncate text-center text-xs font-medium text-white",
  },
  styles: {
    layer: { zIndex: Z_INDEX.NOTIFICATION },
  },
});
