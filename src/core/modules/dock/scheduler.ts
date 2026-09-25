import {
  createScheduler,
  type CoreSchedulerOptions,
  type ScheduledTaskSnapshot,
  type SchedulerSnapshot,
} from "@/core/utils";

export type { ScheduledTaskSnapshot, SchedulerSnapshot };

export function createDockScheduler(options: CoreSchedulerOptions = {}) {
  return createScheduler({
    defaultLabel: "dock-task",
    ...options,
  });
}

export function createPendingSurfaceScheduler({
  clearTimer = clearTimeout,
  scheduler = null,
  scheduleTimer = setTimeout,
}: {
  clearTimer?: any;
  scheduler?: any;
  scheduleTimer?: any;
} = {}) {
  const timers = new Map();
  const cancelTimer = scheduler?.cancel || clearTimer;
  const schedule = scheduler?.schedule
    ? (cb: () => void, ms: number) =>
        scheduler.schedule(cb, ms, { label: "surface:compact-open" })
    : scheduleTimer;

  const cancel = (surfaceId: any) => {
    if (!timers.has(surfaceId)) return false;
    cancelTimer(timers.get(surfaceId));
    timers.delete(surfaceId);
    return true;
  };

  return {
    cancel,
    cancelAll() {
      const surfaceIds = [...timers.keys()];
      surfaceIds.forEach(cancel);
      return surfaceIds;
    },
    getLatestId() {
      const surfaceIds = [...timers.keys()];
      return surfaceIds[surfaceIds.length - 1] || null;
    },
    schedule(surfaceId: any, callback: () => void, delayMs: number) {
      cancel(surfaceId);
      const timerId = schedule(() => {
        timers.delete(surfaceId);
        callback();
      }, delayMs);
      timers.set(surfaceId, timerId);
    },
    get size() {
      return timers.size;
    },
  };
}

export function deferUntilFull({
  action,
  delayMs = 400,
  isCompact,
  key = "dock:defer-until-full",
  onExitCompact,
  scheduler,
}: {
  action: () => void;
  delayMs?: number;
  isCompact: boolean;
  key?: string;
  onExitCompact?: () => void;
  scheduler?: ReturnType<typeof createScheduler> | null;
}): void {
  if (!isCompact) {
    action();
    return;
  }
  onExitCompact?.();
  if (scheduler) {
    scheduler.schedule(action, delayMs, { label: key });
  } else {
    setTimeout(action, delayMs);
  }
}

