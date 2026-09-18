import { EVENT_TYPES, globalEvents } from "@/core/events";

export interface RequestJsonOptions extends RequestInit {
  notifyOnError?: boolean;
  notifyOnUnauthorized?: boolean;
}

export interface HttpError extends Error {
  payload?: unknown;
  status?: number;
}

export async function requestJson<T = any>(
  path: string,
  options: RequestJsonOptions = {},
): Promise<T> {
  const {
    notifyOnError = true,
    notifyOnUnauthorized = true,
    ...requestOptions
  } = options;
  const response = await fetch(path, {
    ...requestOptions,
    headers: {
      ...(requestOptions.body ? { "content-type": "application/json" } : {}),
      ...requestOptions.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error: HttpError = new Error(
      (payload as Record<string, string>)?.error ||
        `Request failed with status ${response.status}`,
    );
    error.status = response.status;
    error.payload = payload;

    if (notifyOnError && (response.status !== 401 || notifyOnUnauthorized)) {
      globalEvents.emit(
        response.status === 401
          ? EVENT_TYPES.API_UNAUTHORIZED
          : EVENT_TYPES.API_ERROR,
        { error, path, source: "app", status: response.status },
      );
    }
    throw error;
  }

  return payload as T;
}
