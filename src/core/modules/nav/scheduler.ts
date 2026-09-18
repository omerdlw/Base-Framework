const DEFAULT_FRAME_MS = 16;
const EMPTY_TASKS = Object.freeze([]);
const IS_DEV = process.env.NODE_ENV !== "production";

function getDefaultNow(): number {
  return typeof performance !== "undefined" &&
    typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

export interface ScheduledTaskSnapshot {
  readonly createdAt: number;
  readonly dueAt: number;
  readonly id: number;
  readonly kind: "timer" | "frame";
  readonly label: string;
}

export interface SchedulerSnapshot {
  readonly pendingCount: number;
  readonly tasks: readonly ScheduledTaskSnapshot[];
}

function freezeTaskSnapshot(task: {
  createdAt: number;
  dueAt: number;
  id: number;
  kind: "timer" | "frame";
  label: string;
}): ScheduledTaskSnapshot {
  return Object.freeze({
    createdAt: task.createdAt,
    dueAt: task.dueAt,
    id: task.id,
    kind: task.kind,
    label: task.label,
  });
}

export function createNavigationScheduler({
  cancelFrame = typeof cancelAnimationFrame === "function"
    ? cancelAnimationFrame
    : clearTimeout,
  clearTimer = clearTimeout,
  now = getDefaultNow,
  requestFrame = typeof requestAnimationFrame === "function"
    ? requestAnimationFrame
    : (cb: FrameRequestCallback) =>
        setTimeout(cb, DEFAULT_FRAME_MS) as unknown as number,
  scheduleTimer = setTimeout,
}: {
  cancelFrame?: (id: any) => void;
  clearTimer?: (id: any) => void;
  now?: () => number;
  requestFrame?: (cb: (time: number) => void) => any;
  scheduleTimer?: (cb: () => void, delayMs?: number) => any;
} = {}) {
  const listeners = new Set<() => void>();
  const tasks = new Map<
    number,
    {
      cancel: (id: any) => void;
      createdAt: number;
      dueAt: number;
      id: number;
      kind: "timer" | "frame";
      label: string;
      nativeId: any;
    }
  >();
  let nextTaskId = 0;
  let snapshot: SchedulerSnapshot = Object.freeze({
    pendingCount: 0,
    tasks: EMPTY_TASKS,
  });

  const publish = () => {
    const currentTasks: ScheduledTaskSnapshot[] = [];
    for (const task of tasks.values()) {
      currentTasks.push(freezeTaskSnapshot(task));
    }

    snapshot = Object.freeze({
      pendingCount: tasks.size,
      tasks: Object.freeze(currentTasks),
    });

    for (const listener of listeners) {
      try {
        listener();
      } catch (error) {
        if (IS_DEV)
          console.warn("[Navigation] Scheduler subscriber failed:", error);
      }
    }
  };

  const schedule = (
    kind: "timer" | "frame",
    callback: (timestamp: number) => void,
    delayMs: number,
    options: { label?: string } = {},
  ): number | null => {
    if (typeof callback !== "function") return null;

    const safeDelay = Math.max(0, Number(delayMs) || 0);
    const taskId = ++nextTaskId;
    const createdAt = now();

    const invoke = (timestamp = now()) => {
      if (!tasks.has(taskId)) return;
      tasks.delete(taskId);
      publish();
      callback(timestamp);
    };

    const nativeId =
      kind === "frame"
        ? requestFrame(invoke)
        : scheduleTimer(invoke, safeDelay);

    tasks.set(taskId, {
      cancel: kind === "frame" ? cancelFrame : clearTimer,
      createdAt,
      dueAt: createdAt + (kind === "frame" ? DEFAULT_FRAME_MS : safeDelay),
      id: taskId,
      kind,
      label:
        typeof options.label === "string" && options.label
          ? options.label
          : "navigation-task",
      nativeId,
    });

    publish();
    return taskId;
  };

  const cancel = (taskId: number): boolean => {
    const task = tasks.get(taskId);
    if (!task) return false;

    tasks.delete(taskId);
    try {
      task.cancel(task.nativeId);
    } catch (error) {
      if (IS_DEV)
        console.warn("[Navigation] Scheduler cancellation failed:", error);
    }

    publish();
    return true;
  };

  return Object.freeze({
    cancel,
    cancelAll(): number[] {
      if (tasks.size === 0) return [];

      const taskIds: number[] = [];

      for (const [taskId, task] of tasks) {
        taskIds.push(taskId);
        try {
          task.cancel(task.nativeId);
        } catch (error) {
          if (IS_DEV)
            console.warn("[Navigation] Scheduler cancellation failed:", error);
        }
      }

      tasks.clear();
      publish();
      return taskIds;
    },
    getSnapshot(): SchedulerSnapshot {
      return snapshot;
    },
    now,
    schedule(
      callback: (timestamp: number) => void,
      delayMs = 0,
      options: { label?: string } = {},
    ): number | null {
      return schedule("timer", callback, delayMs, options);
    },
    scheduleFrame(
      callback: (timestamp: number) => void,
      options: { label?: string } = {},
    ): number | null {
      return schedule("frame", callback, DEFAULT_FRAME_MS, options);
    },
    subscribe(listener: () => void): () => void {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
}

export function createManualNavigationScheduler({
  frameMs = DEFAULT_FRAME_MS,
  startAt = 0,
}: {
  frameMs?: number;
  startAt?: number;
} = {}) {
  const rawTasks = new Map<
    number,
    {
      callback: () => void;
      dueAt: number;
      sequence: number;
    }
  >();
  let currentTime = Number(startAt) || 0;
  let nextRawTaskId = 0;
  let sequence = 0;

  const scheduleTimer = (callback: () => void, delayMs = 0) => {
    const rawTaskId = ++nextRawTaskId;
    rawTasks.set(rawTaskId, {
      callback,
      dueAt: currentTime + Math.max(0, Number(delayMs) || 0),
      sequence: ++sequence,
    });
    return rawTaskId;
  };

  const clearTimer = (rawTaskId: number) => {
    rawTasks.delete(rawTaskId);
  };
  const requestFrame = (callback: (time: number) => void) =>
    scheduleTimer(() => callback(currentTime), frameMs);

  const scheduler = createNavigationScheduler({
    cancelFrame: clearTimer,
    clearTimer,
    now: () => currentTime,
    requestFrame,
    scheduleTimer,
  });

  const getNextTask = ():
    | [number, { callback: () => void; dueAt: number; sequence: number }]
    | null => {
    let minTask: {
      callback: () => void;
      dueAt: number;
      sequence: number;
    } | null = null;
    let minId: number | null = null;

    for (const [id, task] of rawTasks) {
      if (
        !minTask ||
        task.dueAt < minTask.dueAt ||
        (task.dueAt === minTask.dueAt && task.sequence < minTask.sequence)
      ) {
        minTask = task;
        minId = id;
      }
    }

    return minTask && minId != null ? [minId, minTask] : null;
  };

  const runUntil = (targetTime: number, maxTasks = 10_000): number => {
    let executed = 0;

    while (executed < maxTasks) {
      const nextTask = getNextTask();
      if (!nextTask || nextTask[1].dueAt > targetTime) break;

      const [rawTaskId, task] = nextTask;
      rawTasks.delete(rawTaskId);

      currentTime = task.dueAt;
      task.callback();
      executed += 1;
    }

    if (
      executed >= maxTasks &&
      rawTasks.size > 0 &&
      (getNextTask()?.[1].dueAt ?? Infinity) <= targetTime
    ) {
      throw new Error("Navigation scheduler exceeded its task safety limit");
    }

    currentTime = targetTime;
    return executed;
  };

  return Object.freeze({
    ...scheduler,
    advanceBy(durationMs: number) {
      const duration = Math.max(0, Number(durationMs) || 0);
      return runUntil(currentTime + duration);
    },
    runAll(maxTasks = 10_000) {
      let executed = 0;

      while (rawTasks.size > 0) {
        const nextTask = getNextTask();
        if (!nextTask) break;

        const remaining = Math.max(1, maxTasks - executed);
        executed += runUntil(nextTask[1].dueAt, remaining);

        if (executed >= maxTasks && rawTasks.size > 0) {
          throw new Error(
            "Navigation scheduler exceeded its task safety limit",
          );
        }
      }

      return executed;
    },
  });
}
