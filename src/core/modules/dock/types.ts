import type { ComponentType, ReactNode } from "react";

export interface DockIconOverlayConfig {
  icon: any;
  title?: string;
  onClick?: (event?: any) => void;
}

export interface DockBadgeState {
  color?: string;
  value?: string | number | null;
  visible: boolean;
}

export interface DockActionDescriptor {
  key?: string;
  icon?: any;
  tooltip?: string;
  order?: number;
  disabled?: boolean;
  visible?: boolean;
  badge?: string | number | null;
  className?: string | null;
  tone?: string | null;
  onClick?: (event?: any) => void;
  [key: string]: any;
}

export interface DockActionDefinition {
  bind: (overrides?: any) => DockActionDescriptor;
  config: Record<string, any>;
  create: (overrides?: any) => DockActionDescriptor;
  id: string;
  key: string;
  use: (overrides?: any) => void;
}

export interface DockVisualStyleSection {
  className?: string;
  [key: string]: any;
}

export interface DockVisualStyle {
  card: DockVisualStyleSection;
  icon: DockVisualStyleSection;
  title: DockVisualStyleSection;
  description: DockVisualStyleSection;
  scale?: number;
}

export interface BreadcrumbItem {
  id?: string;
  title: string;
  path: string;
  icon?: any;
  isCurrent?: boolean;
  isEllipsis?: boolean;
  level?: number;
  [key: string]: any;
}

export interface BreadcrumbOverride {
  icon?: any;
  title?: string | null;
}

export interface BreadcrumbConfig {
  root?: Partial<BreadcrumbItem>;
  resolvePath?: (context: {
    overrides: Record<string, BreadcrumbOverride>;
    pathname: string;
    root: BreadcrumbItem;
    segments: string[];
  }) => BreadcrumbItem[] | null;
  resolveSegment?: (context: {
    id: string;
    index: number;
    segment: string;
    segments: string[];
    [key: string]: any;
  }) => Partial<BreadcrumbItem> | null;
}

export interface DockHudAction {
  label: string;
  onClick: () => void;
  tone?: "primary" | "destructive" | "secondary";
  variant?: "primary" | "destructive" | "muted";
}

export interface DockHudDescriptor {
  actions?: DockHudAction[];
  autoDismissMs?: number | null;
  component?: ComponentType<any> | null;
  description?: string;
  dismissOnEscape?: boolean;
  dismissOnNavigate?: boolean;
  icon?: any;
  id: string;
  priority?: number;
  props?: Record<string, any>;
  title?: string;
  [key: string]: any;
}

export interface DockHudDefinition {
  config: Record<string, any>;
  create: (props?: any, overrides?: any) => DockHudDescriptor;
  hide: (clearHudFn: (id?: string) => void, targetId?: string) => void;
  id: string;
  show: (
    setHudFn: (descriptor: DockHudDescriptor) => void,
    props?: any,
    overrides?: any,
  ) => {
    dismiss: (clearHudFn: (id?: string) => void) => void;
    id: string;
    update: (nextProps?: any) => void;
  };
  use: (props?: any, overrides?: any) => void;
  useTrigger: () => {
    clear: () => void;
    hide: (targetId?: string) => void;
    show: (props?: any, overrides?: any) => any;
  };
}

export interface SelectionModeState {
  count: number;
  hasSelection: boolean;
  isActive: boolean;
  isAllSelected: boolean;
  selectedIds: any[];
}

export interface DockStatusTheme {
  card: { className?: string };
  icon: { className?: string };
  title: { className?: string };
  description: { className?: string; opacity?: number };
}

export interface DockStatusDescriptor {
  action?: any;
  actions?: any;
  description: string;
  flow?: string | null;
  hideScroll?: boolean;
  icon?: any;
  isOverlay: boolean;
  path?: string;
  priority?: number | null;
  style?: DockStatusTheme;
  title: string;
  type: string;
  [key: string]: any;
}

export interface LastKnownAccount {
  avatarUrl?: string | null;
  displayName?: string | null;
  email?: string | null;
  id?: string | null;
  username?: string | null;
}

export interface SurfaceStep {
  action?: any;
  closeLabel?: string | null;
  component?: ComponentType<any> | null;
  content?: ReactNode;
  description?: string | null;
  descriptionMaxLines?: number;
  element?: ReactNode;
  extensions?: any[];
  header?: {
    description?: string;
    icon?: any;
    title?: string;
  };
  headerAction?: any;
  icon?: any;
  node?: ReactNode;
  props?: Record<string, any>;
  showAction?: boolean | null;
  title?: string | null;
  trailing?: any;
  [key: string]: any;
}

export interface SurfaceExtension {
  component?: ComponentType<any> | null;
  icon?: any;
  id: string;
  label?: string;
  onClick?: () => void;
  priority?: number;
  [key: string]: any;
}

export interface SurfaceReturnHandshake {
  fallbackPath?: string | null;
  path?: string | null;
  source?: string | null;
  viewId?: string | null;
}

export interface SurfaceFlowDefinition {
  createSurface: (context: {
    complete: (result?: any) => void;
    cancel: (result?: any) => void;
    input: any;
    snapshot: any;
    updateSnapshot: (snapshot: any) => void;
    flowId?: string;
  }) => any;
  id: string;
  initialSnapshot: any;
  restoreFromUrl: boolean;
  returnHandshake: SurfaceReturnHandshake | null;
  singleton: boolean;
}

export interface SurfaceFlowSession {
  flowId: string;
  input: any;
  returnHandshake: SurfaceReturnHandshake | null;
  snapshot: any;
  status: string;
}

export interface SurfaceDescriptor {
  action?: any;
  allowSwipeDismiss?: boolean;
  badge?: any;
  closeLabel?: string | null;
  component?: ComponentType<any> | null;
  content?: ReactNode;
  currentStepIndex?: number;
  description?: string | null;
  descriptionMaxLines?: number;
  dismissible?: boolean;
  element?: ReactNode;
  expandHorizontal?: boolean;
  extensions?: SurfaceExtension[];
  flow?: SurfaceFlowSession | null;
  header?: {
    description?: string;
    icon?: any;
    title?: string;
  };
  headerAction?: any;
  icon?: any;
  id?: string | null;
  node?: ReactNode;
  onClose?: ((result?: any) => void) | null;
  props?: Record<string, any>;
  renderMode?: string;
  showAction?: boolean | null;
  steps?: SurfaceStep[] | null;
  syncWithUrl?: boolean;
  title?: string | null;
  trailing?: any;
  urlKey?: string | null;
  width?: number | string | null;
  [key: string]: any;
}

export type SurfaceEntry = SurfaceDescriptor;

export interface SurfaceTransitionState {
  closingSurfaceIds: readonly string[];
  isCompact?: boolean;
  phase: string;
  surfaceIds: readonly string[];
  surfaceLifecycle: string;
}

export interface SurfaceTransitionEvent {
  skipActionDismiss?: boolean;
  surfaceId?: string;
  type: string;
  value?: any;
}

export interface SurfaceTransitionEffect {
  delayMs?: number;
  event?: { type: string };
  label?: string;
  surfaceId?: string;
  surfaceIds?: readonly string[];
  type: string;
}

export interface SurfaceTransitionResult {
  effects: readonly SurfaceTransitionEffect[];
  state: SurfaceTransitionState;
}

export interface SurfaceLifecycleState {
  activeSurfaceId: string | null;
  activeSurfaces: any[];
  isPending: boolean;
  pendingSurfaces: any[];
  surfacePhase: string;
  surfaceStack: any[];
}

export interface SurfaceLifecycleAction {
  payload?: any;
  type: string;
}

export interface DockOperation {
  description?: string;
  error?: any;
  id: string;
  label?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  priority?: number;
  progress?: number | null;
  result?: any;
  status: string;
  timestamp?: number;
  title?: string;
  [key: string]: any;
}

export interface DockOperationState {
  activeOperation: DockOperation | null;
  operations: Record<string, DockOperation>;
}

export interface DockAttention {
  kind: string;
  priority: number;
  source?: any;
}

export interface DockRoutePolicy {
  canNavigate: boolean;
  prefetch?: boolean;
  preserveQuery?: boolean;
  replace?: boolean;
  scroll?: boolean;
  [key: string]: any;
}

export interface DockTransaction {
  error?: any;
  from: string;
  id: string;
  reason?: string;
  source?: string;
  status: string;
  timestamp: number;
  to: string;
}

export interface DockContinuityState {
  lastActivePath?: string | null;
  previousPath?: string | null;
  visitedPaths: string[];
}

export interface DockItemRouteFields {
  activeChild?: any;
  children?: any;
  hasActiveChild?: boolean;
  id?: string | null;
  isParent?: boolean;
  name?: string | null;
  onClick?: (event?: any) => void;
  path?: string | null;
  priority?: number | null;
  targetPath?: string | null;
  type?: string;
}

export interface DockItemPresentationFields {
  action?: any;
  actions?: any;
  badge?: any;
  banner?: any;
  bannerOpacity?: number | null;
  bannerPosition?: string | null;
  bannerRepeat?: string | null;
  bannerSize?: string | null;
  bannerUrl?: string | null;
  className?: string;
  component?: ComponentType<any> | null;
  content?: ReactNode;
  description?: string | null;
  headerAction?: any;
  icon?: any;
  iconOverlay?: DockIconOverlayConfig | null;
  props?: Record<string, any>;
  style?: any;
  title?: string | null;
  width?: number | string | null;
}

export interface DockItemSurfaceFields {
  allowSwipeDismiss?: boolean;
  canGoBack?: boolean;
  closeAllSurfaces?: (() => void) | null;
  closeLabel?: string | null;
  closeSurface?: ((result?: any) => void) | null;
  currentStepIndex?: number;
  dismissible?: boolean;
  expandHorizontal?: boolean;
  extensions?: any[];
  goToStep?: ((index: number, surfaceId?: string | null) => void) | null;
  isFirstStep?: boolean;
  isLastStep?: boolean;
  isSurface?: boolean;
  onAnimationComplete?: () => void;
  onBack?: (() => void) | null;
  onClose?: ((result?: any) => void) | null;
  popStep?: ((surfaceId?: string | null) => void) | null;
  pushStep?: ((step: any, surfaceId?: string | null) => void) | null;
  stepIndex?: number;
  steps?: any[] | null;
  surface?: any;
  surfaceBackLabel?: string | null;
  surfaceCloseLabel?: string | null;
  surfaceComponent?: ComponentType<any> | null;
  surfaceContent?: ReactNode;
  surfaceDescription?: string | null;
  surfaceDescriptionMaxLines?: number;
  surfaceExtensions?: any[];
  surfaceHeaderAction?: any;
  surfaceIcon?: any;
  surfaceId?: string | null;
  surfacePhase?: string;
  surfaceProps?: Record<string, any>;
  surfaceStackEntries?: any[];
  surfaceTitle?: string | null;
  surfaceTrailing?: any;
  totalSteps?: number;
}

export interface DockItemRuntimeFields {
  isAnchoredToBottom?: boolean;
  isDataSource?: boolean;
  isExpanded?: boolean;
  isLoading?: boolean;
  isMasked?: boolean;
  isNotFound?: boolean;
  isOverlay?: boolean;
  isSelected?: boolean;
  isStatus?: boolean;
  mediaAction?: boolean;
}

export interface DockItem
  extends DockItemRouteFields,
    DockItemPresentationFields,
    DockItemSurfaceFields,
    DockItemRuntimeFields {
  [key: string]: any;
}

export interface DockMachineState {
  contextActions: DockActionDescriptor[];
  expanded: boolean;
  hud: DockHudDescriptor | null;
  isHovered: boolean;
  dockHeight: number;
  preparedRouteReset: any | null;
  searchQuery: string;
}

export interface DockMachineAction {
  payload?: any;
  type: string;
}

export interface DockState {
  activeIndex: number;
  activeItem: DockItem | null;
  compact: boolean;
  contextActions: DockActionDescriptor[];
  continuity: {
    getPrevious: () => string | null;
    remember: (path: string) => void;
  };
  expanded: boolean;
  hud: DockHudDescriptor | null;
  isHovered: boolean;
  isHudActive: boolean;
  locationKey: string;
  dockHeight: number;
  dockItems: DockItem[];
  pathname: string;
  rawItems: DockItem[];
  searchQuery: string;
  surfacePhase: string;
  surfaceStack: any[];
}

export interface DockRouteActions {
  cancelActiveTransaction: (reason?: string) => void;
  cancelDock: (reason?: string) => void;
  clearBreadcrumbOverride: (path: string) => void;
  clearDockGuards: () => void;
  clearPreparedRouteReset: () => void;
  completeDock: (path: string) => void;
  continuity: {
    getPrevious: () => string | null;
    remember: (path: string) => void;
  };
  navigate: (href: string, options?: any) => Promise<boolean>;
  openGuardConfirmation: (config: any) => void;
  prepareRouteReset: (policy: any) => void;
  registerBreadcrumbOverride: (
    path: string,
    config: BreadcrumbOverride,
  ) => void;
  registerGuard: (guard: any) => () => void;
}

export interface DockSurfaceActions {
  cancelSurfaceFlow: (flowId: string, result?: any) => void;
  closeAllSurfaces: () => void;
  closeSurface: (result?: any, surfaceId?: string) => void;
  completeSurfaceFlow: (flowId: string, result?: any) => void;
  getSurfaceFlow?: ((flowId: string) => any) | null;
  goBackSurface: () => void;
  goToStep: (index: number, surfaceId?: string | null) => void;
  handleSurfaceAnimationComplete?: ((surfaceId?: string) => void) | null;
  openSurface: (definition: any, config?: any) => any;
  openSurfaceFlow: (
    definition: SurfaceFlowDefinition,
    input?: any,
  ) => Promise<any>;
  popStep: (surfaceId?: string | null) => void;
  pushStep: (step: any, surfaceId?: string | null) => void;
  restoreSurfaceFlow: (definition: SurfaceFlowDefinition) => Promise<any>;
  updateSurfaceFlow: (flowId: string, snapshot: any) => void;
}

export interface DockUiActions {
  clearHud: (id?: string) => void;
  setCompact: (compact: boolean) => void;
  setContextActions: (actions: DockActionDescriptor[]) => void;
  setExpanded: (expanded: boolean) => void;
  setHud: (descriptor: DockHudDescriptor) => void;
  setIsHovered: (hovered: boolean) => void;
  setDockHeight: (height: number) => void;
  setSearchQuery: (query: string) => void;
}

export interface DockActions
  extends DockRouteActions,
    DockSurfaceActions,
    DockUiActions {}

export interface DockDimensions {
  baseHeight: number;
  cardWidth: number;
  compactHeight: number;
  hudHeight: number;
  dockHeight: number;
  stackWidth: number;
}
