const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
};

export function sanitizeHtml(value: string): string {
  return value.replace(/[&<>"'/]/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

export function truncateInput(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

export function parseJsonSafe<T>(
  body: string | null | undefined,
  fallback: T | null = null,
): T | null {
  if (!body) return fallback;
  try {
    return JSON.parse(body) as T;
  } catch {
    return fallback;
  }
}

export function assertNonEmpty(
  value: unknown,
  field = "value",
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must not be empty`);
  }
}

export function assertInRange(
  value: number,
  min: number,
  max: number,
  field = "value",
): void {
  if (value < min || value > max) {
    throw new Error(`${field} must be between ${min} and ${max}`);
  }
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
