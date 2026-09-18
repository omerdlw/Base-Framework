"use client";

import { memo, useCallback, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { NAV_SURFACE_PHASE } from "./constants";
import { toArray } from "./utils";
import {
  getNavActionMotionProps,
  NAV_BADGE_TRANSITION,
  navBadgeVariants,
  navCommandBarSwapVariants,
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

export function isActionlessNavItem(activeItem: any): boolean {
  const isSurfaceActive = Boolean(
    activeItem?.isSurface &&
    activeItem?.surfacePhase !== NAV_SURFACE_PHASE.RESTORING_HEADER,
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

export function useNavCommandRegistry() {
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

function useNavCommands({
  activeItem,
  contextCommands = [],
}: { activeItem?: any; contextCommands?: any[] } = {}) {
  return useMemo(() => {
    if (isActionlessNavItem(activeItem)) return [];

    const extendedCommands = normalizeToolbarActions(activeItem?.actions);
    const dynamicContextCommands = normalizeToolbarActions(contextCommands);
    const mergedCommands = [...extendedCommands, ...dynamicContextCommands];

    if (activeItem?.isStatus && !isStatusToolbarActionAllowed(activeItem)) {
      return [];
    }

    return sortToolbarActionsByOrder(getVisibleToolbarActions(mergedCommands));
  }, [activeItem, contextCommands]);
}

const NavCommand = memo(function NavCommand({ action }: { action: any }) {
  return (
    <TooltipComponent
      className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-black shadow-lg shadow-black/60"
      text={action.tooltip}
    >
      <motion.button
        {...getNavActionMotionProps({ disabled: action.disabled })}
        className="center relative size-8 cursor-pointer rounded-xl p-1 text-white/70 hover:bg-white/10 hover:text-white select-none focus:outline-none"
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
              layout
              key={action.badge}
              variants={navBadgeVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={NAV_BADGE_TRANSITION}
              className="center bg-info absolute -top-1 -right-1 h-4 min-w-4 rounded-full p-1 text-xs leading-none font-semibold text-black"
            >
              {action.badge}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </TooltipComponent>
  );
});

export const NavCommandBar = memo(function NavCommandBar({
  activeItem,
  contextCommands = [],
}: {
  activeItem?: any;
  contextCommands?: any[];
}) {
  const actions = useNavCommands({ activeItem, contextCommands });
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
    <div className="mr-1 flex shrink-0 items-center">
      <AnimatePresence mode="popLayout" onExitComplete={handleExitComplete}>
        {actions.map((action, index) => (
          <motion.div
            key={`${currentPath}-${action.key || action.icon || `nav-action-${index}`}`}
            variants={navCommandBarSwapVariants}
            custom={index}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <NavCommand action={action} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});
