"use client";

import { memo, useCallback, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { DOCK_SURFACE_PHASE } from "./constants";
import { toArray } from "./utils";
import {
  getDockActionMotionProps,
  DOCK_BADGE_TRANSITION,
  DOCK_COMPOSITOR_STYLE,
  dockBadgeVariants,
  dockCommandBarSwapVariants,
} from "./motion";
import { Tooltip } from "@/core/primitives";
import Iconify from "@/core/primitives/icon";

const TooltipComponent = Tooltip as any;
const IconifyComponent = Iconify as any;

function createCommandEntries(commands: any): Record<string, any> {
  const entries: Record<string, any> = {};
  const cmdArray = toArray(commands);

  for (let i = 0; i < cmdArray.length; i++) {
    const command = cmdArray[i];
    if (!command) continue;
    const key = command.key || `context-action-${i}`;
    entries[key] = { key, ...command };
  }
  return entries;
}

function areCommandEntriesEqual(
  currentEntries: Record<string, any>,
  nextEntries: Record<string, any>,
): boolean {
  const currentKeys = Object.keys(currentEntries);
  const nextKeys = Object.keys(nextEntries);

  if (currentKeys.length !== nextKeys.length) return false;

  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i];
    const currentEntry = currentEntries[key];
    const nextEntry = nextEntries[key];

    if (!currentEntry || !nextEntry) return false;

    for (const entryKey in nextEntry) {
      if (entryKey === "onClick") {
        if (typeof currentEntry[entryKey] !== typeof nextEntry[entryKey])
          return false;
      } else if (currentEntry[entryKey] !== nextEntry[entryKey]) {
        return false;
      }
    }
  }

  return true;
}

export function normalizeToolbarActions(actions: any): any[] {
  const arrayActions = toArray(actions);
  const normalized: any[] = [];

  for (let i = 0; i < arrayActions.length; i++) {
    const action = arrayActions[i];
    if (action) {
      normalized.push({ key: action.key ?? `action-${i}`, ...action });
    }
  }
  return normalized;
}

export function getVisibleToolbarActions(actions: any[]): any[] {
  return actions.filter((action) => action.visible !== false);
}

export function sortToolbarActionsByOrder(actions: any[]): any[] {
  return [...actions].sort(
    (left, right) => (right.order ?? 0) - (left.order ?? 0),
  );
}

export function isActionlessDockItem(activeItem: any): boolean {
  const isSurfaceActive = Boolean(
    activeItem?.isSurface &&
    activeItem?.surfacePhase !== DOCK_SURFACE_PHASE.RESTORING_HEADER,
  );
  return Boolean(
    activeItem?.isNotFound ||
    activeItem?.path === "not-found" ||
    activeItem?.isMasked ||
    isSurfaceActive,
  );
}

export function isStatusToolbarActionAllowed(activeItem: any): boolean {
  return (
    activeItem?.type === "APP_ERROR" ||
    activeItem?.type === "API_ERROR" ||
    activeItem?.type === "GUARD"
  );
}

export function useDockCommandRegistry() {
  const [commandEntries, setCommandEntries] = useState<Record<string, any>>({});
  const generatedCommandIdRef = useRef(0);

  const registerCommand = useCallback((command: any) => {
    if (!command) return;

    const key =
      command.key || `context-action-${++generatedCommandIdRef.current}`;

    setCommandEntries((currentEntries) => {
      const existing = currentEntries[key];

      if (existing) {
        let isSame = true;
        for (const k in command) {
          if (k === "onClick") {
            if (typeof command[k] !== typeof existing[k]) {
              isSame = false;
              break;
            }
          } else if (existing[k] !== command[k]) {
            isSame = false;
            break;
          }
        }

        if (isSame) {
          if (command.onClick && existing.onClick !== command.onClick) {
            existing.onClick = command.onClick;
          }
          return currentEntries;
        }
      }

      return { ...currentEntries, [key]: { key, ...command } };
    });
  }, []);

  const unregisterCommand = useCallback((key: string) => {
    if (!key) return;
    setCommandEntries((currentEntries) => {
      if (!currentEntries[key]) return currentEntries;
      const { [key]: _, ...nextEntries } = currentEntries;
      return nextEntries;
    });
  }, []);

  const setCommands = useCallback((commands: any) => {
    if (!commands) {
      setCommandEntries({});
      return;
    }
    const nextEntries = createCommandEntries(commands);
    setCommandEntries((currentEntries) =>
      areCommandEntriesEqual(currentEntries, nextEntries)
        ? currentEntries
        : nextEntries,
    );
  }, []);

  const clearCommands = useCallback(() => {
    setCommandEntries((currentEntries) =>
      Object.keys(currentEntries).length === 0 ? currentEntries : {},
    );
  }, []);

  const contextCommands = useMemo(
    () => Object.values(commandEntries),
    [commandEntries],
  );

  return {
    clearCommands,
    contextCommands,
    registerCommand,
    setCommands,
    unregisterCommand,
  };
}

function useDockCommands({
  activeItem,
  contextCommands = [],
}: { activeItem?: any; contextCommands?: any[] } = {}) {
  return useMemo(() => {
    if (isActionlessDockItem(activeItem)) return [];

    const extendedCommands = normalizeToolbarActions(activeItem?.actions);
    const dynamicContextCommands = normalizeToolbarActions(contextCommands);
    const mergedCommands = [...extendedCommands, ...dynamicContextCommands];

    if (activeItem?.isStatus && !isStatusToolbarActionAllowed(activeItem)) {
      return [];
    }

    return sortToolbarActionsByOrder(getVisibleToolbarActions(mergedCommands));
  }, [activeItem, contextCommands]);
}

const DockCommand = memo(function DockCommand({ action }: { action: any }) {
  return (
    <TooltipComponent
      className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-black"
      text={action.tooltip}
    >
      <motion.button
        {...getDockActionMotionProps({ disabled: action.disabled })}
        className="center relative size-8 cursor-pointer rounded-full bg-transparent text-white/70 transition-colors duration-300 ease-in-out hover:bg-white/5 hover:text-white select-none"
        onClick={(event) => {
          event.stopPropagation();
          action.onClick?.(event);
        }}
        type="button"
        disabled={action.disabled}
        aria-label={action.tooltip}
      >
        <IconifyComponent icon={action.icon} size={16} />

        <AnimatePresence mode="popLayout">
          {action.badge && (
            <motion.span
              key={action.badge}
              variants={dockBadgeVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={DOCK_BADGE_TRANSITION}
              className="center bg-white absolute right-1.5 top-1.5 size-3 rounded-full text-[10px] leading-none font-bold tabular-nums text-black"
            >
              {action.badge}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </TooltipComponent>
  );
});

export const DockCommandBar = memo(function DockCommandBar({
  activeItem,
  contextCommands = [],
}: {
  activeItem?: any;
  contextCommands?: any[];
}) {
  const actions = useDockCommands({ activeItem, contextCommands });
  const pathname = usePathname();

  const currentPath =
    pathname ||
    activeItem?.path ||
    activeItem?.name ||
    activeItem?.id ||
    "root";

  const [isExiting, setIsExiting] = useState(false);
  const [prevActionsCount, setPrevActionsCount] = useState(actions.length);

  if (actions.length !== prevActionsCount) {
    if (actions.length === 0 && prevActionsCount > 0) {
      setIsExiting(true);
    }
    setPrevActionsCount(actions.length);
  }

  const handleExitComplete = useCallback(() => {
    if (actions.length === 0) setIsExiting(false);
  }, [actions.length]);

  if (actions.length === 0 && !isExiting) return null;

  return (
    <div className="flex shrink-0 items-center">
      <AnimatePresence mode="popLayout" onExitComplete={handleExitComplete}>
        {actions.map((action, index) => (
          <motion.div
            key={`${currentPath}-${action.key || action.icon || `dock-action-${index}`}`}
            variants={dockCommandBarSwapVariants}
            style={DOCK_COMPOSITOR_STYLE}
            custom={index}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <DockCommand action={action} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});
