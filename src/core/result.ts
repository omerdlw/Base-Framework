/**
 * Standard Result pattern for type-safe operation and server action outcomes.
 * Uses a discriminated union on `success`.
 */

export interface SuccessResult<T> {
  readonly code?: string;
  readonly data: T;
  readonly error?: never;
  readonly success: true;
}

export interface ErrorResult<E = string> {
  readonly code?: string;
  readonly data?: never;
  readonly error: E;
  readonly success: false;
}

export type Result<T, E = string> = SuccessResult<T> | ErrorResult<E>;

export function ok<T>(data: T, code?: string): SuccessResult<T> {
  return { data, success: true, ...(code ? { code } : {}) };
}

export function err<E = string>(error: E, code?: string): ErrorResult<E> {
  return { error, success: false, ...(code ? { code } : {}) };
}

/**
 * Wraps an async function or promise into a Result without throwing.
 */
export async function tryCatch<T, E = string>(
  promiseOrFn: Promise<T> | (() => Promise<T>),
  mapError?: (error: unknown) => E,
): Promise<Result<T, E>> {
  try {
    const data =
      typeof promiseOrFn === "function"
        ? await promiseOrFn()
        : await promiseOrFn;
    return ok(data);
  } catch (error) {
    const mapped = mapError
      ? mapError(error)
      : ((error instanceof Error
          ? error.message
          : String(error)) as unknown as E);
    return err(mapped);
  }
}
