"use client";

import {
  cloneElement,
  createContext,
  isValidElement,
  memo,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  motion,
  useDragControls,
  useMotionValue,
  useTransform,
} from "motion/react";

import {
  DOCK_CARD_LAYOUT,
  DOCK_SURFACE_PHASE,
} from "./constants";
import { useDockFocusTrap } from "./behavior";
import {
  createSurfaceReturnHandshake,
  isSurfaceDescriptor,
  isValidComponentType,
  normalizeSurfaceExtension,
} from "./utils";
import {
  DOCK_COMPOSITOR_STYLE,
  DOCK_SURFACE_BODY_ENTER_TRANSITION,
  DOCK_SURFACE_BODY_EXIT_TRANSITION,
  DOCK_SURFACE_BODY_STEP_TRANSITION,
  DOCK_SURFACE_DRAG_CONSTRAINTS,
  DOCK_SURFACE_DRAG_ELASTIC,
  DOCK_SURFACE_DRAG_INTERPOLATION,
  DOCK_SURFACE_DRAG_THRESHOLDS,
  dockSurfaceBodyVariants,
  dockSurfaceControlsActionVariants,
  dockSurfaceControlsBackVariants,
  dockSurfaceControlsCloseVariants,
  dockSurfaceControlsContainerVariants,
  dockSurfaceDragTransformTemplate,
} from "./motion";
import { cn } from "@/core/utils";
import { Button, Icon } from "@/core/primitives";

export {
  createSurfaceReturnHandshake,
  isSurfaceDescriptor,
  normalizeSurfaceExtension,
};

const ROUNDED_CLASS_PATTERN = /\brounded(?:-[a-zA-Z0-9_-]+)?\b/g;

export const SurfaceExtensionsContext = createContext<{
  extensions: SurfaceExtensionsStore;
  headerActions: SurfaceHeaderActionStore;
} | null>(null);
export const SurfaceItemContext = createContext<{ id: any; width: any }>({
  id: null,
  width: null,
});

export function useSurfaceDimensions() {
  const { width } = use(SurfaceItemContext);
  return useMemo(() => ({ width }), [width]);
}
export function useSurfaceId() {
  return use(SurfaceItemContext).id;
}

export function useSurfaceHeader() {
  const store = use(SurfaceExtensionsContext)?.headerActions ?? null;
  const surfaceId = useSurfaceId();
  return useCallback(
    (patch: any) => {
      if (!store) return;
      const data = typeof patch === "function" ? patch({}) : patch;
      if (data?.headerAction !== undefined)
        store.setAction(surfaceId, data.headerAction);
    },
    [store, surfaceId],
  );
}

export function useSurfaceAction(action: any) {
  const store = use(SurfaceExtensionsContext)?.headerActions ?? null;
  const surfaceId = useSurfaceId();
  useEffect(() => {
    if (!store || action === undefined) return;
    store.setAction(surfaceId, action);
    return () => store.removeAction(surfaceId);
  }, [store, surfaceId, action]);
}

export function DockSurfaceAction({ children }: { children: ReactNode }) {
  useSurfaceAction(children);
  return null;
}

import { createStore } from "@/core/utils";

class SurfaceHeaderActionStore {
  private store = createStore<{
    actionsBySurface: Record<string, any>;
    version: number;
  }>({
    actionsBySurface: {},
    version: 0,
  });

  get version() {
    return this.store.getSnapshot().version;
  }

  subscribe = (listener: () => void) => this.store.subscribe(listener);

  getAction = (surfaceId: any) => {
    const sId = surfaceId != null ? String(surfaceId) : "global";
    const { actionsBySurface } = this.store.getSnapshot();
    return actionsBySurface[sId] ?? actionsBySurface.global ?? null;
  };

  setAction = (surfaceId: any, action: any) => {
    const sId = surfaceId != null ? String(surfaceId) : "global";
    const current = this.store.getSnapshot();
    if (current.actionsBySurface[sId] === action) return;
    this.store.setState({
      actionsBySurface: {
        ...current.actionsBySurface,
        [sId]: action,
      },
      version: current.version + 1,
    });
  };

  removeAction = (surfaceId: any) => {
    const sId = surfaceId != null ? String(surfaceId) : "global";
    const current = this.store.getSnapshot();
    if (!(sId in current.actionsBySurface)) return;
    const { [sId]: _, ...nextActions } = current.actionsBySurface;
    this.store.setState({
      actionsBySurface: nextActions,
      version: current.version + 1,
    });
  };

  clearSurface = (surfaceId: any) => this.removeAction(surfaceId);
}

class SurfaceExtensionsStore {
  private extensionsBySurface = new Map<string, Map<string, any>>();
  private cachedListBySurface = new Map<string, any[]>();
  private store = createStore<{ version: number }>({ version: 0 });

  get version() {
    return this.store.getSnapshot().version;
  }

  subscribe = (listener: () => void) => this.store.subscribe(listener);

  private notify = () => {
    this.cachedListBySurface.clear();
    this.store.setState((prev) => ({ version: prev.version + 1 }));
  };

  getExtensionsForSurface = (surfaceId: any): any[] => {
    const sId = surfaceId != null ? String(surfaceId) : "global";
    if (this.cachedListBySurface.has(sId))
      return this.cachedListBySurface.get(sId)!;

    const globalExts = this.extensionsBySurface.get("global");
    const surfaceExts = this.extensionsBySurface.get(sId);

    if (!globalExts && !surfaceExts) {
      const empty: any[] = [];
      this.cachedListBySurface.set(sId, empty);
      return empty;
    }

    const merged = new Map([...(globalExts || []), ...(surfaceExts || [])]);
    const result = Array.from(merged.values()).sort(
      (a: any, b: any) => a.order - b.order,
    );
    this.cachedListBySurface.set(sId, result);
    return result;
  };

  setExtension = (surfaceId: any, extension: any) => {
    if (!extension) return;
    const normalized = normalizeSurfaceExtension(extension);
    if (!normalized) return;

    const sId = surfaceId != null ? String(surfaceId) : "global";
    let surfaceMap = this.extensionsBySurface.get(sId);
    if (!surfaceMap) {
      surfaceMap = new Map();
      this.extensionsBySurface.set(sId, surfaceMap);
    }

    const prev = surfaceMap.get(normalized.id);
    if (
      prev &&
      prev.content === normalized.content &&
      prev.align === normalized.align &&
      prev.order === normalized.order &&
      prev.className === normalized.className &&
      prev.unstyled === normalized.unstyled &&
      prev.component === normalized.component &&
      prev.props === normalized.props
    )
      return;

    surfaceMap.set(normalized.id, normalized);
    this.notify();
  };

  removeExtension = (surfaceId: any, extensionId: any) => {
    if (!extensionId) return;
    const sId = surfaceId != null ? String(surfaceId) : "global";
    const surfaceMap = this.extensionsBySurface.get(sId);
    if (!surfaceMap || !surfaceMap.has(extensionId)) return;

    surfaceMap.delete(extensionId);
    if (surfaceMap.size === 0) this.extensionsBySurface.delete(sId);
    this.notify();
  };

  clearSurface = (surfaceId: any) => {
    const sId = surfaceId != null ? String(surfaceId) : "global";
    if (!this.extensionsBySurface.has(sId)) return;
    this.extensionsBySurface.delete(sId);
    this.notify();
  };
}

export function SurfaceExtensionsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const valueRef = useRef<{
    extensions: SurfaceExtensionsStore;
    headerActions: SurfaceHeaderActionStore;
  } | null>(null);
  if (!valueRef.current) {
    valueRef.current = {
      extensions: new SurfaceExtensionsStore(),
      headerActions: new SurfaceHeaderActionStore(),
    };
  }

  return (
    <SurfaceExtensionsContext value={valueRef.current}>
      {children}
    </SurfaceExtensionsContext>
  );
}

export function useSurfaceExtensions(input: any) {
  const store = use(SurfaceExtensionsContext)?.extensions ?? null;
  const surfaceId = useSurfaceId();
  useEffect(() => {
    if (input == null || !store) return;
    const list = Array.isArray(input) ? input : [input];
    list.forEach((item) => store.setExtension(surfaceId, item));
    return () => store.clearSurface(surfaceId);
  }, [store, surfaceId, input]);
  return store;
}

export function DockSurfaceExtension({
  align = "left",
  children,
  className = "",
  id,
  order = 0,
  unstyled = false,
}: {
  align?: string;
  children?: ReactNode;
  className?: string;
  id?: string;
  order?: number;
  unstyled?: boolean;
}) {
  const store = use(SurfaceExtensionsContext)?.extensions ?? null;
  const surfaceId = useSurfaceId();
  const generatedIdRef = useRef<string | null>(null);
  if (generatedIdRef.current === null)
    generatedIdRef.current =
      id || `dock-surface-ext-${Math.random().toString(36).slice(2, 9)}`;
  const effectiveId = id || generatedIdRef.current;

  useEffect(() => {
    if (!store) return;
    store.setExtension(surfaceId, {
      align,
      className,
      content: children,
      id: effectiveId,
      order,
      unstyled,
    });
  });

  useEffect(() => {
    return () => {
      if (store) store.removeExtension(surfaceId, effectiveId);
    };
  }, [store, surfaceId, effectiveId]);
  return null;
}

function ExtensionPill({ ext, fill = false }: { ext: any; fill?: boolean }) {
  const Component = ext.component;
  const content = Component ? (
    isValidComponentType(Component) ? (
      <Component {...ext.props} />
    ) : null
  ) : (
    ext.content
  );
  if (ext.unstyled)
    return (
      <div
        className={cn(
          "pointer-events-auto",
          fill && "w-full min-w-0 flex-1",
          ext.className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    );
  return (
    <div
      className={cn(
        "pointer-events-auto flex min-h-6 h-full max-w-full items-center gap-1 select-none",
        fill && "w-full min-w-0 flex-1 justify-center",
        ext.className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {content}
    </div>
  );
}

export function useIsSurfaceExtensionsVisible(activeItem: any): boolean {
  const store = use(SurfaceExtensionsContext)?.extensions ?? null;
  const surfaceId = activeItem?.surfaceId || "global";
  const isSurface = Boolean(activeItem?.isSurface);
  const phase = activeItem?.surfacePhase;
  const isBodyVisible =
    phase === DOCK_SURFACE_PHASE.EXPANDING_BODY ||
    phase === DOCK_SURFACE_PHASE.OPEN;

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      store ? store.subscribe(onStoreChange) : () => {},
    [store],
  );
  const getSnapshot = useCallback(
    () => (store ? store.getExtensionsForSurface(surfaceId).length : 0),
    [store, surfaceId],
  );

  const dynamicCount = useSyncExternalStore(subscribe, getSnapshot, () => 0);
  const descriptorCount = useMemo(() => {
    const raw = activeItem?.surfaceExtensions || activeItem?.extensions || [];
    return Array.isArray(raw) ? raw.length : 0;
  }, [activeItem?.surfaceExtensions, activeItem?.extensions]);

  return Boolean(
    isSurface && isBodyVisible && (dynamicCount > 0 || descriptorCount > 0),
  );
}

export const DockSurfaceExtensionsBar = memo(function DockSurfaceExtensionsBar({
  activeItem,
}: {
  activeItem?: any;
}) {
  const store = use(SurfaceExtensionsContext)?.extensions ?? null;
  const surfaceId = activeItem?.surfaceId || "global";

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      store ? store.subscribe(onStoreChange) : () => {},
    [store],
  );
  const getSnapshot = useCallback(
    () => (store ? store.getExtensionsForSurface(surfaceId) : []),
    [store, surfaceId],
  );
  const dynamicExtensions = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => [],
  );

  const descriptorExtensions = useMemo(() => {
    const raw = activeItem?.surfaceExtensions || activeItem?.extensions || [];
    return Array.isArray(raw)
      ? raw.map(normalizeSurfaceExtension).filter(Boolean)
      : [];
  }, [activeItem?.surfaceExtensions, activeItem?.extensions]);

  const allExtensions = useMemo(() => {
    const map = new Map();
    descriptorExtensions.forEach((ext: any) => map.set(ext.id, ext));
    dynamicExtensions.forEach((ext: any) => map.set(ext.id, ext));
    return Array.from(map.values()).sort((a: any, b: any) => a.order - b.order);
  }, [descriptorExtensions, dynamicExtensions]);

  if (!allExtensions.length) return null;

  const leftExtensions = allExtensions.filter((e) => e.align === "left");
  const centerExtensions = allExtensions.filter((e) => e.align === "center");
  const rightExtensions = allExtensions.filter((e) => e.align === "right");
  const hasCenter = centerExtensions.length > 0;

  return (
    <div
      className="relative flex h-full w-full items-center justify-between select-none"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={cn(
          "pointer-events-auto z-10 flex h-full items-center justify-start gap-1",
          !hasCenter && leftExtensions.length === 1 && rightExtensions.length === 0
            ? "w-full min-w-0 flex-1"
            : "shrink-0",
        )}
      >
        {leftExtensions.map((ext) => (
          <ExtensionPill
            key={ext.id}
            ext={ext}
            fill={!hasCenter && leftExtensions.length === 1}
          />
        ))}
      </div>
      {hasCenter && (
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
          <div
            className={cn(
              "pointer-events-auto flex items-center justify-center gap-1",
              leftExtensions.length === 0 &&
                rightExtensions.length === 0 &&
                centerExtensions.length === 1 &&
                "w-full",
            )}
          >
            {centerExtensions.map((ext) => (
              <ExtensionPill
                key={ext.id}
                ext={ext}
                fill={
                  leftExtensions.length === 0 &&
                  rightExtensions.length === 0 &&
                  centerExtensions.length === 1
                }
              />
            ))}
          </div>
        </div>
      )}
      <div className="pointer-events-auto z-10 ml-auto flex h-full shrink-0 items-center justify-end gap-1">
        {rightExtensions.map((ext) => (
          <ExtensionPill key={ext.id} ext={ext} />
        ))}
      </div>
    </div>
  );
});

export const DockSurfaceHeaderRadiusContext = createContext<string | null>(null);

function getControlRadiusClass(key: string, activeKeys: string[]): string {
  if (activeKeys.length <= 1) return "rounded-full";
  const index = activeKeys.indexOf(key);
  if (index === 0) return "rounded-l-full rounded-r-none";
  if (index === activeKeys.length - 1) return "rounded-r-full rounded-l-none";
  return "rounded-none";
}

function applyControlRadius(className: any, radiusClass: string): string {
  if (typeof className !== "string" || !className) return radiusClass;
  const stripped = className
    .replace(ROUNDED_CLASS_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
  return [stripped, radiusClass].filter(Boolean).join(" ");
}

export function DockSurfaceHeaderButton({
  children,
  className = "",
  disabled = false,
  onClick,
  ariaLabel,
  icon = null,
}: {
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent) => void;
  ariaLabel?: string;
  icon?: any;
}) {
  const contextRadius = use(DockSurfaceHeaderRadiusContext);
  const radiusClass = contextRadius ?? "rounded-full";
  const isText = Boolean(children);

  return (
    <Button
      type="button"
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      disabled={disabled}
      aria-label={
        ariaLabel || (typeof children === "string" ? children : undefined)
      }
      className={cn(
        "pointer-events-auto center size-9 backdrop-blur-lg shrink-0 cursor-pointer bg-black/60 text-white/70 ring-1 ring-white/10 ring-inset hover:z-10 hover:bg-white/10 hover:text-white hover:ring-white/15 active:scale-96 focus-visible:z-10 focus-visible:bg-white/10 focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/15 focus-visible:outline-none transition-[background-color,color,border-color,border-radius,transform] duration-200 ease-out disabled:opacity-50 disabled:pointer-events-none",
        radiusClass,
        isText && "h-9 px-3.5 text-xs font-semibold whitespace-nowrap",
        className,
      )}
    >
      {icon && <Icon icon={icon} size={16} />}
      {children}
    </Button>
  );
}

export const DockSurfaceControls = memo(function DockSurfaceControls({
  activeItem = null,
  hasExtensions = false,
  onClose = null,
  onBack = null,
  closeLabel = null,
  backLabel = null,
  className = "",
  surfacePhase: propSurfacePhase,
}: {
  activeItem?: any;
  hasExtensions?: boolean;
  onClose?: (() => void) | null;
  onBack?: (() => void) | null;
  closeLabel?: string | null;
  backLabel?: string | null;
  className?: string;
  surfacePhase?: string;
}) {
  const phase = propSurfacePhase ?? activeItem?.surfacePhase;
  const isBodyVisible = phase
    ? phase === DOCK_SURFACE_PHASE.EXPANDING_BODY ||
      phase === DOCK_SURFACE_PHASE.OPEN
    : true;
  const actionStore = use(SurfaceExtensionsContext)?.headerActions ?? null;
  const surfaceId = activeItem?.surfaceId || "global";

  const subscribeAction = useCallback(
    (onStoreChange: () => void) =>
      actionStore ? actionStore.subscribe(onStoreChange) : () => {},
    [actionStore],
  );
  const getActionSnapshot = useCallback(
    () => (actionStore ? actionStore.getAction(surfaceId) : null),
    [actionStore, surfaceId],
  );

  const dynamicAction = useSyncExternalStore(
    subscribeAction,
    getActionSnapshot,
    () => null,
  );
  const resolvedHeaderAction =
    dynamicAction ??
    activeItem?.headerAction ??
    activeItem?.surfaceHeaderAction ??
    null;
  const resolvedClose =
    onClose ||
    (activeItem?.dismissible !== false
      ? activeItem?.closeAllSurfaces || activeItem?.closeSurface
      : null);
  const resolvedBack = onBack || activeItem?.onBack;
  const resolvedCloseLabel =
    closeLabel || activeItem?.surfaceCloseLabel || "Close surface";
  const resolvedBackLabel =
    backLabel || activeItem?.surfaceBackLabel || "Previous step";

  const hasClose = typeof resolvedClose === "function";
  const hasBack = typeof resolvedBack === "function";
  const hasHeaderAction = Boolean(resolvedHeaderAction);

  const activeControlKeys = [
    hasHeaderAction && "action",
    hasBack && "back",
    hasClose && "close",
  ].filter(Boolean) as string[];

  const isControlsVisible = Boolean(
    isBodyVisible &&
    (activeItem ? activeItem.isSurface !== false : true) &&
    activeControlKeys.length > 0,
  );

  const targetY = hasExtensions
    ? DOCK_CARD_LAYOUT.extensionShelfY - DOCK_CARD_LAYOUT.collapsed.offsetY
    : 0;

  return (
    <AnimatePresence>
      {isControlsVisible && (
        <motion.div
          key="dock-surface-controls-container"
          custom={targetY}
          variants={dockSurfaceControlsContainerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-[calc(100%+14px)] z-30 select-none flex items-center justify-center gap-[2px]",
            className,
          )}
        >
          <AnimatePresence initial={false}>
            {hasHeaderAction && (
              <motion.div
                key="dock-surface-custom-action"
                variants={dockSurfaceControlsActionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={cn(
                  "pointer-events-auto flex shrink-0 items-center overflow-hidden",
                  getControlRadiusClass("action", activeControlKeys),
                )}
              >
                <DockSurfaceHeaderRadiusContext
                  value={getControlRadiusClass("action", activeControlKeys)}
                >
                  {isValidElement(resolvedHeaderAction)
                    ? cloneElement(resolvedHeaderAction as ReactElement<any>, {
                        className: applyControlRadius(
                          (resolvedHeaderAction as ReactElement<any>).props
                            ?.className,
                          getControlRadiusClass("action", activeControlKeys),
                        ),
                      })
                    : resolvedHeaderAction}
                </DockSurfaceHeaderRadiusContext>
              </motion.div>
            )}
            {hasBack && (
              <motion.div
                key="dock-surface-back"
                variants={dockSurfaceControlsBackVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={cn(
                  "pointer-events-auto shrink-0 overflow-hidden",
                  getControlRadiusClass("back", activeControlKeys),
                )}
              >
                <Button
                  type="button"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    resolvedBack();
                  }}
                  className={cn(
                    "center size-9 backdrop-blur-lg shrink-0 cursor-pointer bg-black/60 text-white/70 ring-1 ring-white/10 ring-inset hover:z-10 hover:bg-white/10 hover:text-white hover:ring-white/15 active:scale-96 focus-visible:z-10 focus-visible:bg-white/10 focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/15 focus-visible:outline-none transition-[background-color,color,border-color,border-radius,transform] duration-200 ease-out",
                    getControlRadiusClass("back", activeControlKeys),
                  )}
                  aria-label={resolvedBackLabel}
                  title={resolvedBackLabel}
                >
                  <Icon
                    icon="solar:alt-arrow-left-bold"
                    size={16}
                  />
                </Button>
              </motion.div>
            )}
            {hasClose && (
              <motion.div
                key="dock-surface-close"
                layout="position"
                variants={dockSurfaceControlsCloseVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={cn(
                  "pointer-events-auto shrink-0",
                  getControlRadiusClass("close", activeControlKeys),
                )}
              >
                <Button
                  type="button"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    resolvedClose();
                  }}
                  className={cn(
                    "center size-9 backdrop-blur-lg shrink-0 cursor-pointer bg-black/60 text-white/70 ring-1 ring-white/10 ring-inset hover:z-10 hover:bg-white/10 hover:text-white hover:ring-white/15 active:scale-96 focus-visible:z-10 focus-visible:bg-white/10 focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/15 focus-visible:outline-none transition-[background-color,color,border-color,border-radius,transform] duration-200 ease-out",
                    getControlRadiusClass("close", activeControlKeys),
                  )}
                  aria-label={resolvedCloseLabel}
                  title={resolvedCloseLabel}
                >
                  <Icon icon="solar:close-bold" size={16} />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export function DockSurfaceHeader() {
  return null;
}

export interface DockSurfaceShellProps {
  ref?: React.Ref<HTMLElement>;
  title?: string;
  onClose?: (() => void) | null;
  onBack?: (() => void) | null;
  allowSwipeDismiss?: boolean;
  closeLabel?: string;
  backLabel?: string;
  showControls?: boolean;
  className?: string;
  contentClassName?: string;
  children?: ReactNode;
  onAnimationComplete?: any;
  isActive?: boolean;
  surfaceId?: any;
  surfacePhase?: string;
  surfaceWidth?: any;
}

export function DockSurfaceShell({
  ref,
  title = "",
  onClose = null,
  onBack = null,
  allowSwipeDismiss = true,
  closeLabel = "Close surface",
  backLabel = "Previous step",
  showControls = false,
  className = "",
  contentClassName = "",
  children,
  onAnimationComplete = null,
  isActive = true,
  surfaceId = null,
  surfacePhase = DOCK_SURFACE_PHASE.OPEN,
  surfaceWidth = null,
}: DockSurfaceShellProps) {
  const surfaceElementRef = useRef<HTMLElement | null>(null);

  const setSurfaceElementRef = useCallback(
    (node: HTMLElement | null) => {
      surfaceElementRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as any).current = node;
    },
    [ref],
  );

  const isFullyOpen = surfacePhase === DOCK_SURFACE_PHASE.OPEN;
  const titleId =
    surfaceId == null ? undefined : `dock-surface-title-${surfaceId}`;

  const dragY = useMotionValue(0);
  const dragOpacity = useTransform(
    dragY,
    DOCK_SURFACE_DRAG_INTERPOLATION.DRAG_RANGE as any,
    DOCK_SURFACE_DRAG_INTERPOLATION.OPACITY_RANGE as any,
  );
  const dragScale = useTransform(
    dragY,
    DOCK_SURFACE_DRAG_INTERPOLATION.DRAG_RANGE as any,
    DOCK_SURFACE_DRAG_INTERPOLATION.SCALE_RANGE as any,
  );

  useDockFocusTrap({
    containerRef: surfaceElementRef,
    enabled: isActive && isFullyOpen,
    onDismiss: typeof onClose === "function" ? onClose : null,
  });

  const handleDragEnd = (_e: any, info: any) => {
    if (
      !isActive ||
      !allowSwipeDismiss ||
      typeof onClose !== "function" ||
      !isFullyOpen
    )
      return;
    if (
      info.offset.y > DOCK_SURFACE_DRAG_THRESHOLDS.DISMISS_OFFSET_Y ||
      info.velocity.y > DOCK_SURFACE_DRAG_THRESHOLDS.DISMISS_VELOCITY_Y
    ) {
      onClose();
    }
  };

  const dragControls = useDragControls();
  const canDragDismiss = Boolean(
    isActive &&
    allowSwipeDismiss &&
    typeof onClose === "function" &&
    isFullyOpen,
  );

  const handleSurfacePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!canDragDismiss) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest?.(
          'input, textarea, select, [role="slider"], [data-no-surface-drag], [data-lenis-prevent]',
        )
      ) {
        return;
      }
      dragControls.start(event);
    },
    [canDragDismiss, dragControls],
  );

  const isBodyVisible =
    surfacePhase === DOCK_SURFACE_PHASE.EXPANDING_BODY ||
    surfacePhase === DOCK_SURFACE_PHASE.OPEN;
  const resolvedSurfaceId = surfaceId || "active";

  const surfaceItemValue = useMemo(
    () => ({ id: resolvedSurfaceId, width: surfaceWidth }),
    [resolvedSurfaceId, surfaceWidth],
  );

  return (
    <SurfaceItemContext value={surfaceItemValue}>
      <motion.section
        ref={setSurfaceElementRef as any}
        role="dialog"
        aria-modal="true"
        aria-hidden={isActive ? undefined : true}
        aria-labelledby={titleId}
        inert={isActive ? undefined : true}
        tabIndex={-1}
        className={cn(
          "@container relative flex flex-col overflow-hidden rounded-[20px]",
          !isActive && "hidden",
          className,
        )}
        style={{
          WebkitBackfaceVisibility:
            DOCK_COMPOSITOR_STYLE.WebkitBackfaceVisibility,
          backfaceVisibility: DOCK_COMPOSITOR_STYLE.backfaceVisibility,
          WebkitFontSmoothing: DOCK_COMPOSITOR_STYLE.WebkitFontSmoothing,
          y: dragY as any,
          opacity: dragOpacity as any,
          scale: dragScale as any,
        }}
        transformTemplate={dockSurfaceDragTransformTemplate as any}
        drag={canDragDismiss ? "y" : false}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={DOCK_SURFACE_DRAG_CONSTRAINTS}
        dragElastic={DOCK_SURFACE_DRAG_ELASTIC}
        onPointerDown={handleSurfacePointerDown}
        onDragEnd={handleDragEnd}
        onAnimationComplete={onAnimationComplete}
      >
        {title && (
          <h2 id={titleId} className="sr-only">
            {title}
          </h2>
        )}
        {showControls && (
          <DockSurfaceControls
            surfacePhase={surfacePhase}
            onClose={onClose}
            onBack={onBack}
            closeLabel={closeLabel}
            backLabel={backLabel}
          />
        )}
        <AnimatePresence mode="wait" initial={false}>
          {isBodyVisible && (
            <motion.div
              key="surface-body-motion"
              variants={dockSurfaceBodyVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={
                (surfacePhase as any) === DOCK_SURFACE_PHASE.COLLAPSING_BODY
                  ? DOCK_SURFACE_BODY_EXIT_TRANSITION
                  : surfacePhase === DOCK_SURFACE_PHASE.OPEN
                    ? DOCK_SURFACE_BODY_STEP_TRANSITION
                    : DOCK_SURFACE_BODY_ENTER_TRANSITION
              }
              style={{ ...DOCK_COMPOSITOR_STYLE }}
              className={cn(
                "@container w-full overflow-hidden rounded-[20px]",
                contentClassName,
              )}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </SurfaceItemContext>
  );
}
