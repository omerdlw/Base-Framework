import { primitivesTheme } from "@/features/shell/primitives";
import { defineTheme } from "@omerdlw/base-framework/theme";
import { Z_INDEX } from "@omerdlw/base-framework/tokens";

const DISABLED = "disabled:cursor-not-allowed disabled:opacity-50";
const TRANSITION_COLORS = "transition-colors duration-micro ease-out-quart";
const TRANSITION_TRANSFORM =
  "transition-transform duration-micro ease-out-quart";
const LAYER = "col-start-1 row-start-1";
const FIELD_BOX = `w-full ${DISABLED}`;

/**
 * Class map for `src/core/primitives`. Every slot is `<component><Part>`;
 * state variants live inside the slot as `data-*` / `aria-*` modifiers so one
 * slot covers every state of its element.
 */
export const primitivesThemeConfig = defineTheme(primitivesTheme, {
  slots: {
    // AdaptiveImage — data-state: loading | loaded, data-fill
    adaptiveImage: `h-full w-full opacity-0 transition-opacity duration-micro ease-out-quart data-[fill]:absolute data-[fill]:inset-0 data-[fill]:select-none data-[state=loaded]:opacity-100`,
    adaptiveImageFallback: "relative h-full w-full overflow-hidden select-none",
    adaptiveImageFrame:
      "relative h-full w-full overflow-hidden bg-white/5 select-none",

    // Avatar
    avatar:
      "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full select-none",
    avatarFallback:
      "flex h-full w-full items-center justify-center text-xs font-medium uppercase",
    avatarImage: "h-full w-full object-cover",

    // BackdropHero
    backdropHero:
      "relative isolate h-80 w-[calc(100%+2rem)] -translate-x-4 overflow-hidden sm:h-96 sm:w-[calc(100%+3rem)] sm:-translate-x-6 lg:h-[clamp(36rem,52vw,44rem)] lg:w-[calc(100%+16rem)] lg:-translate-x-32 xl:h-[clamp(40rem,56vw,48rem)] xl:w-[calc(100%+24rem)] xl:-translate-x-48",
    backdropHeroGradient: "pointer-events-none absolute inset-0 z-10",
    backdropHeroImage: "absolute inset-0 bg-cover bg-no-repeat",

    // Badge, Button
    badge:
      "inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium select-none",
    button: DISABLED,

    // Checkbox
    checkbox: `inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md transition-all duration-micro ease-out-quart ${DISABLED}`,
    checkboxIndicator:
      "pointer-events-none flex items-center justify-center text-current",

    // Input / Textarea decoration — fieldFloat data-position: inside | bottom-right
    fieldBar: "flex items-center justify-between",
    fieldFloat:
      "pointer-events-auto absolute right-2.5 z-10 data-[position=bottom-right]:bottom-2.5",
    fieldInline: "relative flex w-full items-center",
    fieldStack: "flex w-full flex-col gap-1.5",
    input: FIELD_BOX,
    textarea: `${FIELD_BOX} data-[resize=both]:resize data-[resize=none]:resize-none data-[resize=x]:resize-x data-[resize=y]:resize-y`,

    // FullscreenState
    fullscreen: "fixed inset-0 h-screen w-screen overflow-hidden",
    fullscreenContent: "center h-screen w-screen p-6",

    // Loader, Spinner, and the stack that overlays a loader on content
    loader: "shrink-0 leading-none select-none pointer-events-none",
    loaderInline: "inline-flex items-center justify-center",
    spinner:
      "inline-flex animate-spin items-center justify-center align-middle leading-none",
    stack: "inline-grid place-items-center",
    stackBase: `invisible select-none ${LAYER}`,
    stackTop: `center ${LAYER}`,

    // Progress
    progress: "relative h-2 w-full overflow-hidden rounded-full bg-current/10",
    progressIndicator:
      "h-full w-full origin-left rounded-full bg-current transition-transform duration-base ease-out-quart will-change-transform",

    // Select — selectOption reads data-highlighted, aria-selected, aria-disabled
    selectCheck: "shrink-0 text-white",
    selectChevron: `shrink-0 text-white/50 ${TRANSITION_TRANSFORM} group-aria-expanded:rotate-180`,
    selectContent:
      "absolute top-full left-0 mt-1.5 max-h-64 w-full overflow-y-auto rounded-2xl bg-black/90 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.55)] ring-1 ring-white/10 backdrop-blur-xl ring-inset",
    selectEmpty: "px-3 py-2 text-center text-xs text-white/45",
    selectIcon: "shrink-0 text-white/75",
    selectLabel: "text-xs font-medium text-white/75",
    selectOption: `flex cursor-pointer items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-sm text-white/85 select-none ${TRANSITION_COLORS} data-[highlighted]:bg-white/10 data-[highlighted]:text-white aria-selected:font-medium aria-selected:text-white aria-disabled:cursor-not-allowed aria-disabled:opacity-40`,
    selectOptionBody: "flex min-w-0 flex-col",
    selectOptionContent: "flex min-w-0 items-center gap-2.5",
    selectOptionDescription: "truncate text-xs text-white/50",
    selectPlaceholder: "truncate text-white/50",
    selectRoot: "relative inline-flex w-full flex-col gap-1.5",
    selectText: "truncate",
    selectTrigger: `group flex w-full items-center justify-between gap-2 rounded-xl bg-white/5 px-3.5 py-2.5 text-left text-sm text-white ring-1 ring-white/10 ring-inset hover:bg-white/10 ${TRANSITION_COLORS} ${DISABLED}`,
    selectTriggerContent: "flex min-w-0 items-center gap-2 truncate",

    // Separator — data-orientation: horizontal | vertical
    separator:
      "shrink-0 bg-current/10 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",

    // Skeleton
    skeleton: "skeleton-block rounded-lg",

    // Switch — thumb reads data-state: checked | unchecked
    switch: `relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 ${TRANSITION_COLORS} ${DISABLED}`,
    switchThumb: `pointer-events-none block h-5 w-5 translate-x-0 rounded-full bg-current will-change-transform data-[state=checked]:translate-x-5 ${TRANSITION_TRANSFORM}`,

    // Tooltip
    tooltip: "tooltip-content pointer-events-none select-none",
  },
  styles: {
    loaderInline: { height: "1em", minWidth: "2.5rem" },
    selectContent: { zIndex: Z_INDEX.SELECT },
    tooltip: { zIndex: Z_INDEX.TOOLTIP },
  },
});
