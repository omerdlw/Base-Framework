# Result — `@/core/result`

## Purpose

`Result<T, E>` is the contract for anything that crosses the network boundary, above all Server Actions ([Rule 6](../architecture-and-rules.md#rule-6-result-pattern-returns)). Instead of throwing, a function returns either `{ success: true, data }` or `{ success: false, error }`. Next.js serializes thrown errors poorly and strips their details in production, while a returned `Result` arrives intact and forces the caller to handle both branches.

`createSafeAction` wraps a handler so thrown exceptions, schema failures and validation failures all become `err(...)` automatically.

## Public API

| Export                                                                     | Description                                                                                                                    |
| :------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| `Result<T, E = string>`                                                    | `SuccessResult<T> \| ErrorResult<E>`. Both carry an optional `code`.                                                           |
| `ok(data, code?)` / `err(error, code?)`                                    | Constructors.                                                                                                                  |
| `isResult(value)`, `isOk(r)`, `isErr(r)`                                   | Type guards.                                                                                                                   |
| `unwrap(r)`                                                                | Returns `data` or throws the error; for trusted internal code only.                                                            |
| `unwrapOr(r, fallback)`                                                    | Returns `data` or the fallback.                                                                                                |
| `map(r, fn)`, `mapErr(r, fn)`                                              | Transform one branch.                                                                                                          |
| `match(r, { ok, err })`                                                    | Exhaustive branch handling.                                                                                                    |
| `tryCatch(promiseOrFn, mapError?)`                                         | Awaits a promise (or async function) and returns a `Result`.                                                                   |
| `createSafeAction(handler, { schema?, validate?, mapError?, errorCode? })` | Wraps an action: validates args (any `safeParse` schema, e.g. Zod), catches throws, and normalizes raw returns into `ok(...)`. |

## Usage

```ts
"use server";
import { ok, err, type Result } from "@/core/result";

export async function renameProjectAction(
  id: string,
  name: string,
): Promise<Result<{ id: string }>> {
  if (!name.trim()) return err("Name is required", "VALIDATION");
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.from("projects").update({ name }).eq("id", id);
    return ok({ id });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Rename failed");
  }
}
```

```ts
// Same guarantees, less boilerplate
export const renameProject = createSafeAction(
  async (input: { id: string; name: string }) => updateProject(input), // may throw
  { schema: RenameSchema, errorCode: "RENAME_FAILED" },
);
```

```tsx
// Client: branch explicitly, or let the toast helpers do it
const result = await renameProjectAction(id, name);
if (isErr(result)) return toast(result.error);
toast.fromResult(result, { success: "Renamed" }); // see notification.md
```

`useServerAction` / `useAsyncAction` in `@/core/hooks` consume `Result`s directly and emit `APP_ERROR` on failure.

## File responsibilities

A single file, `src/core/result.ts`. It has no dependencies, so it is safe on both server and client.

## Dependencies

- **Uses:** nothing.
- **Used by:** every `server/actions.ts` in `src/features/**`, `@/core/hooks` (`useServerAction`, `useAsyncAction`), and notifications (`toast.fromResult`). Tested in `tests/result.test.js`.
