import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import { defineTheme } from "@omerdlw/base-framework/theme";
import { backgroundTheme } from "@omerdlw/base-framework/modules/background";

const FILL = "pointer-events-none absolute inset-0";
const FADE = "transition-opacity ease-out-quart duration-moderate";
const SHOWN = "opacity-0 data-[visible=true]:opacity-100";

/**
 * Class map for `src/modules/background`. Direction, position and visibility
 * variants are `data-*` modifiers on the element's own slot:
 * `data-side`, `data-position`, `data-width`, `data-visible`.
 */
export const backgroundThemeConfig = defineTheme(backgroundTheme, {
  slots: {
    // Layers
    root: "pointer-events-none fixed inset-0 transform-gpu",
    image: "absolute inset-0 bg-cover bg-no-repeat",
    solid: `${FILL} transition-all duration-base ease-in-out-cubic`,
    gradient:
      "pointer-events-none fixed inset-y-0 z-0 data-[side=left]:left-0 data-[side=right]:right-0",
    edge: "pointer-events-none absolute inset-y-0 z-10 data-[side=left]:left-0 data-[side=right]:right-0",
    noise:
      "pointer-events-none transform-gpu data-[position=absolute]:absolute data-[position=absolute]:inset-0 data-[position=fixed]:fixed data-[position=fixed]:inset-0 data-[position=fixed]:h-screen data-[position=fixed]:w-screen",

    // Direct video — videoFrame data-position: left | right | center, data-width: full
    video: "h-full w-full object-cover",
    videoFrame:
      "pointer-events-none absolute inset-y-0 overflow-hidden data-[position=center]:inset-x-0 data-[position=center]:mx-auto data-[position=left]:left-0 data-[position=left]:ml-0 data-[position=left]:mr-auto data-[position=right]:right-0 data-[position=right]:mr-0 data-[position=right]:ml-auto data-[width=full]:w-full",

    // YouTube player — layers fade through data-visible
    youtube: "pointer-events-none relative h-full w-full overflow-hidden",
    youtubeBlackout: `${FILL} z-10 bg-black`,
    youtubeCover: `${FILL} z-10 bg-black transition-opacity duration-slow ease-out-quart ${SHOWN}`,
    youtubeFrame: `${FILL} overflow-hidden ${FADE} ${SHOWN}`,
    youtubeHost:
      "pointer-events-none absolute top-1/2 left-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 scale-[1.35] [&>div]:h-full [&>div]:w-full [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0",
    youtubePoster: `${FILL} z-10 bg-cover bg-center bg-no-repeat ${FADE} ${SHOWN}`,
    youtubeSpinner: `${FILL} z-20 flex items-center justify-center transition-opacity duration-base ease-out-quart ${SHOWN}`,
    youtubeSpinnerIcon: "text-white",
    youtubeVideo: `${FADE} ${SHOWN}`,
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
