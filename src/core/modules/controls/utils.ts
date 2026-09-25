import { clamp, toFiniteNumber } from "@/core/utils";
import {
  CONTROLS_EDGE_INSET,
  CONTROLS_DOCK_GAP,
  CONTROL_SIDE_NAMES,
  CONTROLS_DOCK_ELEMENT_ID,
} from "./constants";
import type {
  ControlEntry,
  ControlsLayout,
  ControlsPairItem,
  ResolvedControlsPairs,
  ViewportDimensions,
} from "./types";

export function getViewport(): ViewportDimensions {
  if (typeof window === "undefined") {
    return {
      height: 0,
      width: 0,
    };
  }
  return {
    height: window.innerHeight,
    width: window.innerWidth,
  };
}

export function getDockStackElement(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(CONTROLS_DOCK_ELEMENT_ID);
}

export function getDockElement(): Element | null {
  if (typeof document === "undefined") return null;
  return (
    document.querySelector('[data-controls-anchor="true"]') ??
    getDockStackElement()
  );
}

export function getControlsLayoutSnapshot(): ControlsLayout | null {
  const dockElement = getDockElement();
  if (!dockElement) return null;
  const layout = getControlsLayout(
    dockElement.getBoundingClientRect(),
    getViewport(),
  );
  const dockStackElement = getDockStackElement();
  return layout
    ? {
        ...layout,
        isHidden: dockStackElement?.dataset.controlsHidden === "true",
      }
    : null;
}

export function hasControls<T>(controls: T[] | unknown): controls is T[] {
  return Array.isArray(controls) && controls.length > 0;
}

export function resolveControlsPairs(
  entries: Record<string, ControlEntry> | ControlEntry[] | null | undefined,
  pathname: string,
): ResolvedControlsPairs {
  const rows = new Map<
    number,
    {
      left: ControlsPairItem | null;
      order: number;
      right: ControlsPairItem | null;
    }
  >();
  const values = Array.isArray(entries)
    ? entries
    : Object.values(entries || {});

  values
    .filter(
      (entry): entry is ControlEntry =>
        entry?.path === pathname &&
        CONTROL_SIDE_NAMES.includes(
          entry.side as (typeof CONTROL_SIDE_NAMES)[number],
        ) &&
        entry.content !== undefined &&
        entry.content !== null &&
        entry.content !== false,
    )
    .sort((left, right) => {
      const orderDifference =
        toFiniteNumber(left.order) - toFiniteNumber(right.order);
      return orderDifference || String(left.id).localeCompare(String(right.id));
    })
    .forEach((entry) => {
      const order = toFiniteNumber(entry.order);
      const row = rows.get(order) || { left: null, order, right: null };
      const candidate: ControlsPairItem = {
        content: entry.content,
        id: entry.id,
      };

      if (entry.side === "left" || entry.side === "right") {
        const current = row[entry.side];
        if (
          !current ||
          String(candidate.id).localeCompare(String(current.id)) < 0
        ) {
          row[entry.side] = candidate;
        }
      }

      rows.set(order, row);
    });

  const pairs = Array.from(rows.values())
    .sort((left, right) => left.order - right.order)
    .filter(
      (
        row,
      ): row is {
        left: ControlsPairItem;
        order: number;
        right: ControlsPairItem;
      } => Boolean(row.left && row.right),
    );

  return {
    left: pairs.map(({ left }) => left),
    right: pairs.map(({ right }) => right),
  };
}

export function getControlsLayout(
  dockRect:
    | DOMRect
    | { bottom: number; height: number; left: number; right: number }
    | null,
  viewport: ViewportDimensions,
  edgeInset: number = CONTROLS_EDGE_INSET,
  dockGap: number = CONTROLS_DOCK_GAP,
): ControlsLayout | null {
  const viewportWidth = toFiniteNumber(viewport?.width);
  const viewportHeight = toFiniteNumber(viewport?.height);

  if (!dockRect || viewportWidth <= 0 || viewportHeight <= 0) {
    return null;
  }

  const inset = Math.max(0, toFiniteNumber(edgeInset));
  const dockLeft = clamp(toFiniteNumber(dockRect.left), 0, viewportWidth);
  const dockRight = clamp(toFiniteNumber(dockRect.right), dockLeft, viewportWidth);
  const dockBottom = clamp(toFiniteNumber(dockRect.bottom), 0, viewportHeight);
  const dockHeight = Math.max(0, toFiniteNumber(dockRect.height));
  const gap = Math.max(0, toFiniteNumber(dockGap));

  return {
    bottom: Math.max(0, viewportHeight - dockBottom),
    height: dockHeight / 2,
    left: {
      maxWidth: Math.max(0, dockLeft - inset * 2 - gap),
      right: Math.max(inset, viewportWidth - dockLeft + gap),
    },
    right: {
      left: Math.min(viewportWidth - inset, dockRight + gap),
      maxWidth: Math.max(0, viewportWidth - dockRight - inset * 2 - gap),
    },
  };
}

export function areLayoutsEqual(
  a: ControlsLayout | null,
  b: ControlsLayout | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.bottom === b.bottom &&
    a.height === b.height &&
    a.isHidden === b.isHidden &&
    a.left?.maxWidth === b.left?.maxWidth &&
    a.left?.right === b.left?.right &&
    a.right?.left === b.right?.left &&
    a.right?.maxWidth === b.right?.maxWidth
  );
}
