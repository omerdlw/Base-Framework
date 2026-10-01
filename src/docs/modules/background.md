# Background — `@/modules/background`

## Purpose

Background renders the full-viewport layer behind every page: a color, an image, a direct video file, or a YouTube video. Optional overlay, edge fades, gradients and noise sit on top. Pages declare what they want through `usePage({ background })`. The module resolves priority between the static registry, the current route and dynamic overrides, then crossfades between backgrounds.

YouTube backgrounds don't use the YouTube iframe by default. The module streams the video through the app's own `/api/background/youtube` route (see `src/app/api/background/youtube/`), so it can drive a real `<video>` element with muting, looping, playback rate and poster frames. `forceIframe` falls back to the embed.

The module deliberately has no presets (`BACKGROUND_PRESETS` is banned by `tests/kernel.test.js`). Pass a URL or a `BackgroundState` object.

## Public API

| Export                                                                                                                                | Kind      | Description                                                                                                                           |
| :------------------------------------------------------------------------------------------------------------------------------------ | :-------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| `backgroundModule`                                                                                                                    | module    | The `defineModule` definition: install it in `CoreProvider` to get the provider, the backdrop and `usePage({ background })`.          |
| `BackgroundProvider`                                                                                                                  | component | Stable actions context plus a state store (read via `useBackgroundState`). Mounted by the module host.                                |
| `BackgroundOverlay` (default)                                                                                                         | component | Renders the active background layer(s).                                                                                               |
| `useBackground(config?, options?)`                                                                                                    | hook      | Registers a background for the current route and returns state + actions. Accepts a URL string or `Partial<BackgroundState>`.         |
| `useBackgroundState()`                                                                                                                | hook      | `BackgroundStateComputed`: resolved state plus `hasBackground`, `isVideo`, `isYouTube`, `youtubeVideoId`, `posterUrl`.                |
| `useBackgroundActions()`                                                                                                              | hook      | `setBackground`, `resetBackground`, `setVideoPlaying`, `toggleVideo`, `toggleMute`, `setVideoMuted`, `toggleLoop`, `setVideoElement`. |
| `defineBackground(def)`                                                                                                               | builder   | Reusable background with `.use(overrides?)`.                                                                                          |
| `useBackgroundRegistration`                                                                                                           | hook      | Registers a background for the current page outside `usePage` (same input as `usePage({ background })`).                              |
| `extractYouTubeVideoId`, `isYouTubeUrl`, `isDirectVideoUrl`, `parseYouTubeUrlConfig`, `getYouTubeStreamUrl`, `getYouTubeThumbnailUrl` | utils     | YouTube URL parsing and proxy URL builders.                                                                                           |
| `DEFAULT_BACKGROUND`                                                                                                                  | constant  | The empty background state.                                                                                                           |

## Usage

```tsx
// Image with a dimming overlay
usePage({
  background: { image: "/images/hero.jpg", overlay: true, overlayOpacity: 0.5 },
});
```

```tsx
// YouTube loop, muted, 1080p via the stream proxy
usePage({
  background: {
    video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30",
    videoOptions: { loop: true, muted: true, quality: "1080p" },
  },
});
```

```tsx
// Media controls (the dock's media card uses exactly these)
const { toggleVideo, toggleMute } = useBackgroundActions();
const { isVideo, isPlaying } = useBackgroundState();
```

## File responsibilities

| File                 | Responsibility                                                                                                                                              |
| :------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`           | Public barrel.                                                                                                                                              |
| `types.ts`           | `BackgroundState`, `VideoOptions`, actions, and the computed state.                                                                                         |
| `constants.ts`       | Defaults and class maps.                                                                                                                                    |
| `utils.ts`           | Input normalization, state merging, video option and class-name resolution.                                                                                 |
| `gradient.ts`        | Gradient and edge-fade math.                                                                                                                                |
| `playback.ts`        | Direct `<video>` playback, mute and loop sync.                                                                                                              |
| `builder.ts`         | `defineBackground`.                                                                                                                                         |
| `module.tsx`         | `backgroundModule`: registry type `background` (singleton key `page-background`, immediate), page slice and `page.modules.background` (actions plus `set`). |
| `provider.tsx`       | Context: merges registry entries, holds the video element, exposes actions.                                                                                 |
| `view.tsx`           | `BackgroundOverlay`: layering, crossfade, image/video/YouTube rendering.                                                                                    |
| `overlays.tsx`       | Gradient, noise and solid overlays.                                                                                                                         |
| `native-video.tsx`   | `<video>` element with autoplay, loop and end handling.                                                                                                     |
| `motion.ts`          | Crossfade timing and easing derived from motion tokens.                                                                                                     |
| `youtube.ts`         | YouTube URL parsing (`?t=`, `start`, `end`), stream and thumbnail URL builders, the element proxy.                                                          |
| `youtube-player.tsx` | `YouTubeBackgroundPlayer`: streamed `<video>` + companion `<audio>` with poster, spinner and retry handling.                                                |
| `youtube-iframe.ts`  | Iframe fallback: API loader and `useYouTubeIframePlayer` (a `<video>` proxy over the YouTube player).                                                       |

## Dependencies

- **Uses:** `@/core/kernel` (`defineModule`, `useModuleRegistration`, `useRegistryValue`), `@/core/tokens`, `@/core/utils`, `@/core/hooks`; the HTTP route `src/app/api/background/youtube`.
- **Used by:** `src/core/provider.tsx` (installs `backgroundModule`). The dock reads it with `useModuleState("background", …)` / `useModule("background")` for its media card and `isVideo` detection, through `definePeer` and falls back to an inert state when background is not installed.

## Theming

The module contains no classes or static inline styles. Values that come from a page's background config (colors, opacities, widths, masks, object-position) are applied in the module, as is the compositor hint `willChange`. Styling comes from `src/config/background.module.theme.ts` (`backgroundTheme` spec): slots for the layer (`root`, `image`, `videoFrame*`, `video`), overlays (`gradient*`, `edge*`, `noise*`, `solid`) and the YouTube player (`yt*`, `visible`, `hidden`), plus `styles` for `z-index`, gradient width and the noise defaults (image, repeat, blend, opacity), which a page's noise config overrides. The `bg-*` tokens and the `fit` option resolve to the `object*` / `fit*` slots (object-fit/position classes).
