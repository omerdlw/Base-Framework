import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const isBrowser: boolean = typeof window !== "undefined";

export function getSiteUrl(): string {
  return stripTrailingSlash(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  );
}

export function getCurrentPath(): string {
  if (!isBrowser) return "/";
  return `${window.location.pathname}${window.location.search}`;
}

export function trimToNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function stripTrailingSlash(url: unknown): string {
  if (typeof url !== "string") return "";
  return url.replace(/\/+$/, "");
}

export function normalizePath(path: unknown): string {
  const trimmed = trimToNull(path);
  if (!trimmed) return "";
  if (trimmed === "/") return "/";
  return stripTrailingSlash(trimmed);
}

export function isImageIconSource(icon: unknown): boolean {
  return (
    typeof icon === "string" &&
    (icon.startsWith("http://") ||
      icon.startsWith("https://") ||
      icon.startsWith("/") ||
      icon.startsWith("data:image/"))
  );
}

export function isValidBannerUrl(banner: unknown): boolean {
  const value = trimToNull(banner);
  if (!value) return false;
  return /^(https?:\/\/|\/|data:image\/)/.test(value);
}

export function clamp(value: unknown, min: number, max: number): number {
  const num = Number(value);
  const finite = Number.isFinite(num) ? num : min;
  return Math.min(Math.max(finite, min), max);
}

export function toFiniteNumber(value: unknown, fallback: number = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function randomBetween(min: number, max: number): number {
  const lower = Math.ceil(min);
  const upper = Math.floor(max);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

export function isObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isPlainObject(value: unknown): value is Record<string, any> {
  if (!isObject(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" || Array.isArray(value))
    return value.length === 0;
  if (isObject(value)) return Object.keys(value).length === 0;
  return false;
}

export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (
    typeof a !== "object" ||
    a === null ||
    typeof b !== "object" ||
    b === null
  ) {
    return false;
  }

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (
      !Object.prototype.hasOwnProperty.call(b, key) ||
      !Object.is((a as any)[key], (b as any)[key])
    ) {
      return false;
    }
  }

  return true;
}

export function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function dedupe<T>(
  array: T[],
  keyFn: ((item: T) => unknown) | null = null,
): T[] {
  if (!Array.isArray(array)) return [];
  if (!keyFn) return [...new Set(array)];
  const seen = new Set();
  return array.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function truncate(
  text: unknown,
  maxLength: number = 100,
  suffix: string = "...",
): string {
  if (typeof text !== "string") return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}${suffix}`;
}

export function capitalize(str: unknown): string {
  if (typeof str !== "string" || !str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function slugify(str: unknown): string {
  if (typeof str !== "string" || !str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatMediaTime(seconds: number | string = 0): string {
  const sec = Math.max(0, Math.floor(Number(seconds) || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function normalizeFeedbackText<T = unknown>(value: T): T {
  if (typeof value !== "string") return value;
  let text = value.trim();
  while (text.endsWith(".") || text.endsWith("...")) {
    text = text.endsWith("...")
      ? text.slice(0, -3).trim()
      : text.slice(0, -1).trim();
  }
  return text as T;
}

export function sleep(ms: number = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number = 300,
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  function debounced(...args: Parameters<T>): void {
    if (timeoutId !== null) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      func(...args);
    }, wait);
  }
  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  return debounced;
}

export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number = 300,
): (...args: Parameters<T>) => void {
  let lastRan = 0;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  return function throttled(...args: Parameters<T>): void {
    const now = Date.now();
    if (now - lastRan >= limit) {
      lastRan = now;
      func(...args);
    } else if (!timerId) {
      timerId = setTimeout(
        () => {
          lastRan = Date.now();
          timerId = null;
          func(...args);
        },
        limit - (now - lastRan),
      );
    }
  };
}

export function safeJsonParse<T = unknown>(
  text: unknown,
  fallback: T | null = null,
): T | null {
  if (typeof text !== "string") return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export function safeJsonStringify(
  value: unknown,
  fallback: string = "",
): string {
  try {
    return JSON.stringify(value) ?? fallback;
  } catch {
    return fallback;
  }
}
