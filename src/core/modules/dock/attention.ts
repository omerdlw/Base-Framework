import {
  DOCK_ATTENTION_KIND,
  DOCK_ATTENTION_PRIORITY,
  DOCK_ATTENTION_PRIORITY_OFFSET_MAX,
  DOCK_HUD_PRIORITY,
  DOCK_OPERATION_STATUS,
} from "./constants";
import type { DockAttention } from "./types";

function createAttentionCandidate(
  kind: string,
  source: any,
  priority: number,
): DockAttention {
  return { kind, priority, source };
}

function normalizeAttentionPriority(value: any): number {
  const priority = Number(value);
  if (!Number.isFinite(priority)) return DOCK_HUD_PRIORITY.DEFAULT;
  return Math.min(DOCK_ATTENTION_PRIORITY_OFFSET_MAX, Math.max(0, priority));
}

export function resolveDockAttention({
  hud = null,
  isPageLoading = false,
  operation = null,
  status = null,
  surface = null,
}: {
  hud?: any;
  isPageLoading?: boolean;
  operation?: any;
  status?: any;
  surface?: any;
} = {}): DockAttention {
  const candidates: (DockAttention | null)[] = [
    surface?.isSurfaceOpen
      ? createAttentionCandidate(
          DOCK_ATTENTION_KIND.SURFACE,
          surface,
          DOCK_ATTENTION_PRIORITY.SURFACE,
        )
      : null,
    status?.isOverlay
      ? createAttentionCandidate(
          DOCK_ATTENTION_KIND.STATUS,
          status,
          DOCK_ATTENTION_PRIORITY.STATUS_OVERLAY +
            normalizeAttentionPriority(status.priority),
        )
      : null,
    operation?.status === DOCK_OPERATION_STATUS.PENDING
      ? createAttentionCandidate(
          DOCK_ATTENTION_KIND.OPERATION,
          operation,
          DOCK_ATTENTION_PRIORITY.OPERATION +
            normalizeAttentionPriority(operation.priority),
        )
      : null,
    hud?.isActive
      ? createAttentionCandidate(
          DOCK_ATTENTION_KIND.HUD,
          hud,
          DOCK_ATTENTION_PRIORITY.HUD + normalizeAttentionPriority(hud.priority),
        )
      : null,
    isPageLoading
      ? createAttentionCandidate(
          DOCK_ATTENTION_KIND.LOADING,
          null,
          DOCK_ATTENTION_PRIORITY.LOADING,
        )
      : null,
    status
      ? createAttentionCandidate(
          DOCK_ATTENTION_KIND.STATUS,
          status,
          DOCK_ATTENTION_PRIORITY.STATUS +
            normalizeAttentionPriority(status.priority),
        )
      : null,
    createAttentionCandidate(
      DOCK_ATTENTION_KIND.ROUTE,
      null,
      DOCK_ATTENTION_PRIORITY.ROUTE,
    ),
  ];

  const validCandidates = candidates.filter(
    (c): c is DockAttention => c !== null,
  );

  return validCandidates.reduce((active, candidate) =>
    candidate.priority > active.priority ? candidate : active,
  );
}

export interface DockScene {
  companion: "notification" | "breadcrumbs" | null;
  density: "compact" | "full";
  expanded: boolean;
  isCompanionVisible: boolean;
  topKind: "surface" | "status-overlay" | "status" | "hud" | "route";
}

export function resolveDockScene({
  activeItem,
  compact = false,
  expanded = false,
  hasBreadcrumbs = false,
  isHudActive = false,
  isNotificationVisible = false,
  isOverlayActive = false,
  isStatusActive = false,
  isSurfaceActive = false,
}: {
  activeItem?: any;
  compact?: boolean;
  expanded?: boolean;
  hasBreadcrumbs?: boolean;
  isHudActive?: boolean;
  isNotificationVisible?: boolean;
  isOverlayActive?: boolean;
  isStatusActive?: boolean;
  isSurfaceActive?: boolean;
} = {}): DockScene {
  const topKind: DockScene["topKind"] = isSurfaceActive
    ? "surface"
    : isOverlayActive && isStatusActive
      ? "status-overlay"
      : isStatusActive
        ? "status"
        : isHudActive
          ? "hud"
          : "route";

  const companion: DockScene["companion"] = isNotificationVisible
    ? "notification"
    : expanded && !isOverlayActive && hasBreadcrumbs
      ? "breadcrumbs"
      : null;

  const density: DockScene["density"] =
    compact &&
    !expanded &&
    !isOverlayActive &&
    !isNotificationVisible &&
    Boolean(activeItem)
      ? "compact"
      : "full";

  return {
    companion,
    density,
    expanded,
    isCompanionVisible: companion !== null,
    topKind,
  };
}

