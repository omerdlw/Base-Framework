import { Z_INDEX } from "@/core/tokens";
import { defineTheme } from "@/modules/theme";
import { backgroundTheme } from "@/modules/background";

export const backgroundThemeConfig = defineTheme(backgroundTheme, {
  slots: {
    root: "pointer-events-none fixed inset-0 transform-gpu",
    image: "absolute inset-0 bg-cover bg-no-repeat",
    videoFrame: "pointer-events-none absolute inset-y-0 overflow-hidden",
    videoFrameFull: "w-full",
    videoFrameLeft: "left-0 ml-0 mr-auto",
    videoFrameRight: "right-0 mr-0 ml-auto",
    videoFrameCenter: "inset-x-0 mx-auto",
    video: "h-full w-full object-cover",

    objectBottom: "object-bottom",
    objectCenter: "object-center",
    objectContain: "object-contain",
    objectCover: "object-cover",
    objectFill: "object-fill",
    objectLeft: "object-left",
    objectLeftBottom: "object-left-bottom",
    objectLeftTop: "object-left-top",
    objectNone: "object-none",
    objectRight: "object-right",
    objectRightBottom: "object-right-bottom",
    objectRightTop: "object-right-top",
    objectScaleDown: "object-scale-down",
    objectTop: "object-top",
    fitContain: "object-contain",
    fitCover: "object-cover",
    fitFill: "object-fill",
    fitNone: "object-none",
    fitScaleDown: "object-scale-down",

    gradient: "pointer-events-none fixed inset-y-0 z-0",
    gradientLeft: "left-0",
    gradientRight: "right-0",
    edge: "pointer-events-none absolute inset-y-0 z-10",
    edgeLeft: "left-0",
    edgeRight: "right-0",
    noise: "pointer-events-none transform-gpu",
    noiseFixed: "fixed inset-0 h-screen w-screen",
    noiseAbsolute: "absolute inset-0",
    solid:
      "pointer-events-none absolute inset-0 transition-all duration-base ease-in-out-cubic",

    visible: "opacity-100",
    hidden: "opacity-0",
    ytRoot: "pointer-events-none relative h-full w-full overflow-hidden",
    ytCover:
      "pointer-events-none absolute inset-0 z-10 bg-black transition-opacity duration-slow ease-out-quart",
    ytSpinner:
      "pointer-events-none absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-base ease-out-quart",
    ytSpinnerIcon: "text-white",
    ytPoster:
      "pointer-events-none absolute inset-0 z-10 bg-cover bg-center bg-no-repeat transition-opacity ease-out-quart duration-moderate",
    ytBlackout: "pointer-events-none absolute inset-0 z-10 bg-black",
    ytFrame:
      "pointer-events-none absolute inset-0 overflow-hidden transition-opacity ease-out-quart duration-moderate",
    ytIframeHost:
      "pointer-events-none absolute top-1/2 left-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 scale-[1.35] [&>div]:h-full [&>div]:w-full [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0",
    ytVideo: "transition-opacity ease-out-quart duration-moderate",
  },
  styles: {
    root: { zIndex: Z_INDEX.BACKGROUND },
    gradient: { width: "50vw" },
    videoFrame: { maxWidth: "100%" },
    noise: {
      backgroundImage: "url(/images/noise.webp)",
      backgroundRepeat: "repeat",
      mixBlendMode: "overlay",
      opacity: 0.04,
    },
  },
});
