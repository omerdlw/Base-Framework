# Notification — `@/modules/notification`

## Purpose

Notification is the toast system. `useToast()` returns a callable `toast(message)` with helpers for promises, `Result` objects and dismissal. Toasts render as glass cards stacked against the dock (they portal next to `#dock-card-stack`), so feedback appears where the user's attention already is.

It also listens to framework events: `API_UNAUTHORIZED` shows "session expired", and `APP_ERROR` / `STATE_CHANGE` with `notify: true` show their message. Features can therefore surface feedback without importing this module.

## Public API

| Export                                                                      | Kind      | Description                                                                                                                                           |
| :-------------------------------------------------------------------------- | :-------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useToast(defaultDuration?)`                                                | hook      | Returns a `ToastController`: `toast(msg, opts?)`, `.promise(p, messages)`, `.fromResult(result, messages)`, `.dismiss(id?)`, `.dismissAll()`.         |
| `notificationModule`                                                        | module    | The `defineModule` definition: install it in `CoreProvider` to get the provider, the toast stack, the event listener and `page.modules.notification`. |
| `NotificationProvider`                                                      | component | Holds notifications keyed by id (with `dedupeKey` support). Mounted by the module host.                                                               |
| `useNotification()` / `useNotificationActions()` / `useNotificationState()` | hooks     | Low-level access (`showNotification`, `dismissNotification`, …).                                                                                      |
| `NotificationContext`                                                       | context   | Holds actions and the state store; state is read via `useNotificationState`.                                                                          |
| `TOAST_DURATIONS`                                                           | constant  | Default toast durations.                                                                                                                              |

## Usage

```tsx
const toast = useToast();

toast("Profile saved");
toast("Link copied", 1500); // duration in ms
toast("Syncing…", { id: "sync", dedupeKey: "sync" }); // update in place

await toast.promise(uploadAvatar(file), {
  loading: "Uploading…",
  success: "Avatar updated",
  error: (e) => `Upload failed: ${String(e)}`,
});

toast.fromResult(await updateProfileAction(form), { success: "Saved" }); // Result<T, E>
```

```ts
// From anywhere, without importing the module
globalEvents.emit(EVENT_TYPES.STATE_CHANGE, {
  message: "Draft restored",
  notify: true,
});
```

## File responsibilities

| File           | Responsibility                                                                                                                           |
| :------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`     | Public barrel.                                                                                                                           |
| `types.ts`     | Notification data, options, and the `ToastController` contract.                                                                          |
| `constants.ts` | Durations, session message, dock-anchored glass styles (`bg-black/60`, `backdrop-blur-lg`, `rounded-[20px]`, enforced by tests).         |
| `utils.ts`     | Option normalization, sorting, type guards.                                                                                              |
| `toast.ts`     | `useToast`: the imperative, builder-equivalent API.                                                                                      |
| `module.tsx`   | `notificationModule`: `usePage({ notification: ms })` sets the page's default toast duration; `page.modules.notification.toast` uses it. |
| `provider.tsx` | Notification state, show and dismiss, auto-dismiss timers.                                                                               |
| `view.tsx`     | Container, overlay card, and the event listeners.                                                                                        |
| `motion.ts`    | Toast variants and transition.                                                                                                           |

`builder.ts` is intentionally absent; see [README](./README.md#why-some-optional-files-are-absent).

## Dependencies

- **Uses:** `@/core/kernel` (`defineModule`), `@/core/events` (`globalEvents`, `EVENT_TYPES`), `@/core/hooks` (`useGlobalEvent`), `@/core/result` (`fromResult`), `@/core/tokens`, `@/core/utils`. It finds the dock via the DOM id `dock-card-stack`.
- **Used by:** `src/core/provider.tsx` (installs `notificationModule`), `page.modules.notification`, and features such as the account social surface.

## Theming

The module contains no classes or inline styles. It declares a contract (`notificationTheme` spec in `constants.ts`, slot type in `types.ts`) and reads styling from the project's `src/config/notification.module.theme.ts`, registered in `src/config/index.ts` and passed to `ThemeProvider` in `src/app/providers.tsx`. A missing theme throws a descriptive error. Animations (`motion.ts`) stay in the module.

| Part     | Keys                                                        | Notes                          |
| :------- | :---------------------------------------------------------- | :----------------------------- |
| `slots`  | `layer`, `toast`, `toastDocked`, `toastFloating`, `message` | Tailwind classes, all required |
| `styles` | same slot keys                                              | optional inline CSS per slot   |

## Writing toast copy

- Speak to the user, never the developer: no codes, no vendor names, no stack wording.
- Say what happened and what to do: "Couldn't rename this passkey", not "Failed to rename".
- Sentence case, no trailing period, no exclamation marks. Success is short: "Profile updated".
- Never pass `error.message` to `toast`. Use `toUserMessage(error, { fallback: "Couldn't …" })`; the toast hooks (`fromResult`, `promise`) and `useServerAction` / `useAsyncAction` already do.
