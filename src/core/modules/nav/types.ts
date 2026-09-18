import type { ComponentType, ReactNode } from "react";

export interface NavIconOverlayConfig {
  icon: any;
  title?: string;
  onClick?: (event?: any) => void;
}

export interface NavBadgeState {
  color?: string;
  value?: string | number | null;
  visible: boolean;
}

export interface NavActionDescriptor {
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

export interface NavActionDefinition {
  bind: (overrides?: any) => NavActionDescriptor;
  create: (overrides?: any) => NavActionDescriptor;
  key: string;
  use: (overrides?: any) => void;
}

export interface NavVisualStyleSection {
  className?: string;
  [key: string]: any;
}

export interface NavVisualStyle {
  card: NavVisualStyleSection;
  icon: NavVisualStyleSection;
  title: NavVisualStyleSection;
  description: NavVisualStyleSection;
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

export interface NavHudAction {
  label: string;
  onClick: () => void;
  tone?: "primary" | "destructive" | "secondary";
  variant?: "primary" | "destructive" | "muted";
}

export interface NavHudDescriptor {
  actions?: NavHudAction[];
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

export interface NavHudDefinition {
  create: (props?: any, overrides?: any) => NavHudDescriptor;
  hide: (clearHudFn: (id?: string) => void, targetId?: string) => void;
  id: string;
  show: (
    setHudFn: (descriptor: NavHudDescriptor) => void,
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

export interface NavStatusTheme {
  card: { className?: string };
  icon: { className?: string };
  title: { className?: string };
  description: { className?: string; opacity?: number };
}

export interface NavStatusDescriptor {
  action?: any;
  actions?: any;
  description: string;
  flow?: string | null;
  hideScroll?: boolean;
  icon?: any;
  isOverlay: boolean;
  path?: string;
  priority?: number | null;
  style?: NavStatusTheme;
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

export interface NavigationOperation {
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

export interface NavigationOperationState {
  activeOperation: NavigationOperation | null;
  operations: Record<string, NavigationOperation>;
}

export interface NavigationAttention {
  kind: string;
  priority: number;
  source?: any;
}

export interface NavigationRoutePolicy {
  canNavigate: boolean;
  prefetch?: boolean;
  preserveQuery?: boolean;
  replace?: boolean;
  scroll?: boolean;
  [key: string]: any;
}

export interface NavigationTransaction {
  error?: any;
  from: string;
  id: string;
  reason?: string;
  source?: string;
  status: string;
  timestamp: number;
  to: string;
}

export interface NavigationContinuityState {
  lastActivePath?: string | null;
  previousPath?: string | null;
  visitedPaths: string[];
}

export interface NavItem {
  action?: any;
  actions?: any;
  activeChild?: any;
  allowSwipeDismiss?: boolean;
  badge?: any;
  banner?: any;
  bannerOpacity?: number | null;
  bannerPosition?: string | null;
  bannerRepeat?: string | null;
  bannerSize?: string | null;
  bannerUrl?: string | null;
  canGoBack?: boolean;
  children?: any;
  className?: string;
  closeAllSurfaces?: (() => void) | null;
  closeLabel?: string | null;
  closeSurface?: ((result?: any) => void) | null;
  component?: ComponentType<any> | null;
  content?: ReactNode;
  currentStepIndex?: number;
  description?: string | null;
  dismissible?: boolean;
  expandHorizontal?: boolean;
  extensions?: any[];
  goToStep?: ((index: number, surfaceId?: string | null) => void) | null;
  hasActiveChild?: boolean;
  headerAction?: any;
  icon?: any;
  iconOverlay?: NavIconOverlayConfig | null;
  id?: string | null;
  isAnchoredToBottom?: boolean;
  isDataSource?: boolean;
  isExpanded?: boolean;
  isFirstStep?: boolean;
  isLastStep?: boolean;
  isLoading?: boolean;
  isMasked?: boolean;
  isNotFound?: boolean;
  isOverlay?: boolean;
  isParent?: boolean;
  isSelected?: boolean;
  isStatus?: boolean;
  isSurface?: boolean;
  mediaAction?: boolean;
  name?: string | null;
  onAnimationComplete?: () => void;
  onBack?: (() => void) | null;
  onClick?: (event?: any) => void;
  onClose?: ((result?: any) => void) | null;
  path?: string | null;
  popStep?: ((surfaceId?: string | null) => void) | null;
  priority?: number | null;
  props?: Record<string, any>;
  pushStep?: ((step: any, surfaceId?: string | null) => void) | null;
  stepIndex?: number;
  steps?: any[] | null;
  style?: any;
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
  targetPath?: string | null;
  title?: string | null;
  totalSteps?: number;
  type?: string;
  width?: number | string | null;
  [key: string]: any;
}

export interface NavigationMachineState {
  contextActions: NavActionDescriptor[];
  expanded: boolean;
  hud: NavHudDescriptor | null;
  isHovered: boolean;
  navHeight: number;
  preparedRouteReset: any | null;
  searchQuery: string;
}

export interface NavigationMachineAction {
  payload?: any;
  type: string;
}

export interface NavigationState {
  activeIndex: number;
  activeItem: NavItem | null;
  compact: boolean;
  contextActions: NavActionDescriptor[];
  continuity: {
    getPrevious: () => string | null;
    remember: (path: string) => void;
  };
  expanded: boolean;
  hud: NavHudDescriptor | null;
  isHovered: boolean;
  isHudActive: boolean;
  locationKey: string;
  navHeight: number;
  navigationItems: NavItem[];
  pathname: string;
  rawItems: NavItem[];
  searchQuery: string;
  surfacePhase: string;
  surfaceStack: any[];
}

export interface NavigationActions {
  cancelActiveTransaction: (reason?: string) => void;
  cancelNavigation: (reason?: string) => void;
  cancelSurfaceFlow: (flowId: string, result?: any) => void;
  clearBreadcrumbOverride: (path: string) => void;
  clearHud: (id?: string) => void;
  clearNavigationGuards: () => void;
  clearPreparedRouteReset: () => void;
  closeAllSurfaces: () => void;
  closeSurface: (result?: any, surfaceId?: string) => void;
  completeNavigation: (path: string) => void;
  completeSurfaceFlow: (flowId: string, result?: any) => void;
  continuity: {
    getPrevious: () => string | null;
    remember: (path: string) => void;
  };
  getSurfaceFlow?: ((flowId: string) => any) | null;
  goBackSurface: () => void;
  goToStep: (index: number, surfaceId?: string | null) => void;
  handleSurfaceAnimationComplete?: ((surfaceId?: string) => void) | null;
  navigate: (href: string, options?: any) => Promise<boolean>;
  openGuardConfirmation: (config: any) => void;
  openSurface: (definition: any, config?: any) => any;
  openSurfaceFlow: (
    definition: SurfaceFlowDefinition,
    input?: any,
  ) => Promise<any>;
  popStep: (surfaceId?: string | null) => void;
  prepareRouteReset: (policy: any) => void;
  pushStep: (step: any, surfaceId?: string | null) => void;
  registerBreadcrumbOverride: (
    path: string,
    config: BreadcrumbOverride,
  ) => void;
  registerGuard: (guard: any) => () => void;
  restoreSurfaceFlow: (definition: SurfaceFlowDefinition) => Promise<any>;
  setCompact: (compact: boolean) => void;
  setContextActions: (actions: NavActionDescriptor[]) => void;
  setExpanded: (expanded: boolean) => void;
  setHud: (descriptor: NavHudDescriptor) => void;
  setIsHovered: (hovered: boolean) => void;
  setNavHeight: (height: number) => void;
  setSearchQuery: (query: string) => void;
  updateSurfaceFlow: (flowId: string, snapshot: any) => void;
}

export interface NavDimensions {
  baseHeight: number;
  cardWidth: number;
  compactHeight: number;
  hudHeight: number;
  navHeight: number;
  stackWidth: number;
}
