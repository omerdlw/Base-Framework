import {
  DEFAULT_DEDUPE_WINDOW,
  MAX_CONTEXT,
  MAX_FINGERPRINTS,
} from "./constants";
import type {
  ErrorReport,
  ErrorReporterHandler,
  ErrorReporterOptions,
} from "./types";
import {
  createReport,
  normalizeDedupeWindow,
  normalizeSampleRate,
} from "./utils";

const IS_DEV = process.env.NODE_ENV === "development";
const IS_BROWSER = typeof window !== "undefined";

interface SentryScope {
  setContext: (name: string, context: Record<string, unknown>) => void;
  setExtra: (key: string, extra: unknown) => void;
  setFingerprint: (fingerprint: string[]) => void;
  setTag: (key: string, value: string) => void;
  setUser: (user: unknown) => void;
}

declare global {
  interface Window {
    Sentry?: {
      captureException: (error: unknown) => void;
      withScope: (callback: (scope: SentryScope) => void) => void;
    };
  }
}

class ErrorReporter {
  private handlers: ErrorReporterHandler[] = [];
  private context: Record<string, unknown> = {};
  private tags: Record<string, string> = {};
  private seen = new Set<string>();
  private enabled: boolean;
  private sampleRate: number;
  private beforeSend: ((report: ErrorReport) => ErrorReport | null) | null;
  private dedupeWindow: number;

  constructor(options: ErrorReporterOptions = {}) {
    this.enabled = options.enabled ?? true;
    this.sampleRate = normalizeSampleRate(options.sampleRate ?? 1);
    this.beforeSend = options.beforeSend || null;
    this.dedupeWindow = normalizeDedupeWindow(
      options.deduplicateWindow ?? DEFAULT_DEDUPE_WINDOW,
    );
  }

  addHandler(handler: ErrorReporterHandler): this {
    if (typeof handler?.handle === "function") {
      this.handlers.push(handler);
    }
    return this;
  }

  removeHandler(name: string): this {
    this.handlers = this.handlers.filter((handler) => handler.name !== name);
    return this;
  }

  setContext(key: string, value: unknown): this {
    if (
      Object.hasOwn(this.context, key) ||
      Object.keys(this.context).length < MAX_CONTEXT
    ) {
      this.context[key] = value;
    }
    return this;
  }

  setTag(key: string, value: unknown): this {
    this.tags[key] = String(value);
    return this;
  }

  captureError(
    error: unknown,
    extraContext: Record<string, unknown> = {},
  ): ErrorReport | undefined {
    if (!this.enabled || Math.random() > this.sampleRate) return;

    this.ensureDefaultHandlers();

    const context = { ...this.context, ...extraContext };
    let report = createReport(error, { context, tags: { ...this.tags } });
    const dedupeKey = report.fingerprint;

    if (this.seen.has(dedupeKey)) return;

    if (this.seen.size >= MAX_FINGERPRINTS) {
      const first = this.seen.keys().next().value;
      if (first) this.seen.delete(first);
    }

    this.seen.add(dedupeKey);
    setTimeout(() => this.seen.delete(dedupeKey), this.dedupeWindow);

    if (typeof this.beforeSend === "function") {
      try {
        const transformed = this.beforeSend(report);
        if (!transformed) return;
        report = transformed;
      } catch (err) {
        if (IS_DEV)
          console.warn("[ErrorReporter] beforeSend callback failed:", err);
      }
    }

    this.handlers.forEach((handler) => {
      try {
        handler.handle(report);
      } catch (err) {
        if (IS_DEV)
          console.warn(
            `[ErrorReporter] Handler "${handler.name}" failed:`,
            err,
          );
      }
    });

    return report;
  }

  captureMessage(
    message: string,
    level = "info",
    context: Record<string, unknown> = {},
  ): ErrorReport | undefined {
    const error = new Error(message);
    error.name = "Message";
    return this.captureError(error, { ...context, level });
  }

  ensureDefaultHandlers(): void {
    if (this.handlers.length || !IS_BROWSER) return;

    this.handlers.push(createConsoleHandler());

    if (window.Sentry) {
      const sentryHandler = createSentryHandler(window.Sentry);
      if (sentryHandler.name === "sentry") {
        this.handlers.push(sentryHandler);
      }
    }
  }
}

let instance: ErrorReporter | null = null;

export function getErrorReporter(
  options: ErrorReporterOptions = {},
): ErrorReporter {
  if (!instance) {
    instance = new ErrorReporter(options);
  }
  return instance;
}

export function createConsoleHandler({
  level = "error",
  expanded = false,
}: {
  level?: "error" | "warn" | "log" | "info";
  expanded?: boolean;
} = {}): ErrorReporterHandler {
  const log = console[level] || console.error;

  return {
    name: "console",
    handle(report: ErrorReport) {
      if (expanded) {
        console.group(`🔴 ErrorReporter: ${report.error.name}`);
        console.log(report);
        console.groupEnd();
        return;
      }
      log("[ErrorReporter]", {
        error: report.error.message,
        fingerprint: report.fingerprint,
        route: report.environment.route,
      });
    },
  };
}

export function createSentryHandler(Sentry: unknown): ErrorReporterHandler {
  const sentryObj = Sentry as {
    captureException?: (err: Error) => void;
    withScope?: (cb: (scope: SentryScope) => void) => void;
  } | null;

  if (
    !sentryObj ||
    typeof sentryObj.captureException !== "function" ||
    typeof sentryObj.withScope !== "function"
  ) {
    if (IS_DEV)
      console.warn("[ErrorReporter] Missing or invalid Sentry SDK instance");
    return createConsoleHandler();
  }

  return {
    name: "sentry",
    handle(report: ErrorReport) {
      sentryObj.withScope!((scope: SentryScope) => {
        if (report.fingerprint) scope.setFingerprint([report.fingerprint]);
        if (report.user) scope.setUser(report.user);

        if (report.tags && typeof report.tags === "object") {
          Object.entries(report.tags).forEach(([key, value]) =>
            scope.setTag(key, String(value)),
          );
        }

        if (report.environment)
          scope.setContext("environment", report.environment);
        if (report.context) scope.setContext("custom", report.context);
        if (report.componentStack)
          scope.setExtra("componentStack", report.componentStack);

        const error = new Error(report.error.message);
        error.name = report.error.name || "Error";
        error.stack = report.error.stack || undefined;

        sentryObj.captureException!(error);
      });
    },
  };
}
