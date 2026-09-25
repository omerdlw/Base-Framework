export type * from "./types";

export { default, Dock } from "./view";

export {
  DOCK_ACTION_DISMISS_TRANSITION,
  DOCK_BACKDROP_TRANSITION,
  DOCK_BUTTON_TRANSITION,
  DOCK_CARD_COLLAPSE_TRANSITION,
  DOCK_CARD_EXPAND_TRANSITION,
  DOCK_CARD_HEIGHT_CLOSE_TRANSITION,
  DOCK_CARD_HEIGHT_OPEN_TRANSITION,
  DOCK_CARD_SPRING,
  DOCK_CARD_TRANSITION,
  DOCK_COMPACT_RESTORE_DURATION_MS,
  DOCK_COMPACT_STACK_ENTER_TRANSITION,
  DOCK_COMPACT_STACK_EXIT_TRANSITION,
  DOCK_COMPOSITOR_STYLE,
  DOCK_FADE_TRANSITION,
  DOCK_HEADER_SWAP_TRANSITION,
  DOCK_MEDIA_VOLUME_FILL_TRANSITION,
  DOCK_MEDIA_VOLUME_THUMB_POSITION_TRANSITION,
  DOCK_MICRO_TRANSITION,
  DOCK_REDUCED_MOTION_TRANSITION,
  DOCK_RESULTS_EXIT_TRANSITION,
  DOCK_RESULTS_STAGGER_DELAY,
  DOCK_RESULTS_TRANSITION,
  DOCK_SCRUBBER_TOOLTIP_SPRING,
  DOCK_SCRUBBER_TOOLTIP_TRANSITION,
  DOCK_SKELETON_PULSE_CLASS,
  DOCK_STACK_TRANSITION,
  DOCK_SURFACE_BODY_ENTER_TRANSITION,
  DOCK_SURFACE_BODY_EXIT_TRANSITION,
  DOCK_SURFACE_BODY_STEP_TRANSITION,
  DOCK_SURFACE_CHOREOGRAPHY_TIMINGS,
  DOCK_SURFACE_DRAG,
  DOCK_SURFACE_DRAG_CONSTRAINTS,
  DOCK_SURFACE_DRAG_ELASTIC,
  DOCK_SURFACE_DRAG_INTERPOLATION,
  DOCK_SURFACE_DRAG_THRESHOLDS,
  DOCK_SURFACE_EXTENSIONS_ENTER_TRANSITION,
  DOCK_SURFACE_EXTENSIONS_EXIT_TRANSITION,
  DOCK_SURFACE_HEADER_REVEAL_DELAY_MS,
  DOCK_SURFACE_RESIZE_TRANSITION,
  DOCK_SURFACE_TRANSITION,
  DOCK_TAP_SCALE,
  getDockActionStaggerTransition,
  getDockBackdropTransition,
  getDockCardContentAnimateProps,
  getDockCardDelay,
  getDockDescriptionVariants,
  getDockItemAnimateValues,
  getDockItemTransition,
  getDockMediaVolumeFillTransition,
  getDockMediaVolumeThumbAnimateProps,
  getDockMediaVolumeThumbPositionTransition,
  getDockScrollProgressStyle,
  getDockStackAnimateProps,
  getPrefersReducedMotion,
  dockActionDismissVariants,
  dockActionVariants,
  dockBackdropVariants,
  dockBadgeVariants,
  dockBreadcrumbsVariants,
  dockCommandBarSwapVariants,
  dockFadeVariants,
  dockHeaderRestoreVariants,
  dockHeaderSwapVariants,
  dockHudVariants,
  dockIconVariants,
  dockListItemVariants,
  dockMediaVolumeThumbVariants,
  dockScrubberTooltipVariants,
  dockSoundwaveBarVariants,
  dockSurfaceBodyVariants,
  dockSurfaceControlsActionVariants,
  dockSurfaceControlsBackVariants,
  dockSurfaceControlsCloseVariants,
  dockSurfaceControlsContainerVariants,
  dockSurfaceControlsVariants,
  dockSurfaceDragTransformTemplate,
  dockSurfaceExtensionsVariants,
  slideFadeVariants,
  staggerItemVariants,
  textCrossfadeVariants,
} from "./motion";

export {
  DOCK_ACTION_STYLES,
  DOCK_ATTENTION_KIND,
  DOCK_ATTENTION_PRIORITY,
  DOCK_ATTENTION_PRIORITY_OFFSET_MAX,
  DOCK_COLLAPSE_TO_COMPACT_DELAY_MS,
  DOCK_HUD_PRIORITY,
  DOCK_HUD_RENDER_MODE,
  DOCK_HUD_VARIANT,
  DOCK_SURFACE_FLOW_STATUS,
  DOCK_SURFACE_PHASE,
  DOCK_SURFACE_RENDER_MODE,
  DOCK_CONTINUITY_EVENTS,
  DOCK_EVENTS,
  DOCK_LIFECYCLE,
  DOCK_OPERATION_EVENTS,
  DOCK_OPERATION_STATUS,
  DOCK_SURFACE_RETURN_MAX_ENTRIES,
  DOCK_TRANSACTION_STATUS,
  SURFACE_CLASSES,
} from "./constants";

export {
  getDockActionClass,
  isEqualRoutePath,
  isSameItem,
  isSameDockItem,
  isSamePath,
  isValidBannerUrl,
  isValidComponentType,
} from "./utils";

export {
  DockMediaControls,
  DockMediaScrubber,
  DockSoundwave,
  formatMediaTime,
} from "./media";

export {
  DOCK_BANNER_BLUR_MASK,
  DOCK_BANNER_SCRIM,
  DOCK_BANNER_SHARP_MASK,
  DockCardBanner,
  DockCardHeader,
  DockDescription,
  DockIcon,
  DockTitle,
  resolveDockHeaderKey,
} from "./cards";

export {
  BreadcrumbProvider,
  DockBreadcrumbsCard,
  resolveRouteBreadcrumbs,
  useBreadcrumbActions,
  useBreadcrumbOverrides,
  useDockBreadcrumbs,
  useRegisterBreadcrumbOverride,
} from "./breadcrumbs";

export {
  areHudDefinitionsEqual,
  createHudDefinition,
  createDockOperationHud,
  isHudDescriptor,
  resolveActiveHud,
  upsertHudEntry,
} from "./hud";

export {
  DockSurfaceAction,
  DockSurfaceExtension,
  DockSurfaceExtensionsBar,
  SurfaceExtensionsContext,
  SurfaceExtensionsProvider,
  SurfaceItemContext,
  createSurfaceReturnHandshake,
  isSurfaceDescriptor,
  normalizeSurfaceExtension,
  useIsSurfaceExtensionsVisible,
  useSurfaceAction,
  useSurfaceDimensions,
  useSurfaceExtensions,
  useSurfaceHeader,
  useSurfaceId,
} from "./surface";

export {
  applySurfaceToDockItem,
  createInlineSurfaceEntry,
  createSurfaceEntryDefinition,
  createSurfaceFlowBuilder,
  createSurfaceFlowDefinition,
  createSurfaceFlowSession,
  resolveActiveStepDefinition,
  resolveSurfaceAction,
  resolveSurfaceViewModel,
  updateSurfaceFlowSession,
  useSurfaceFlow,
} from "./surface-flow";

export { createPendingSurfaceScheduler } from "./surface-machine";

export {
  ErrorAction,
  ErrorActions,
  GuardAction,
  GuardActions,
  applyStatusOverlay,
  createErrorStatus,
  createGuardStatus,
  getStatusTheme,
  useDockStatus,
} from "./status";

export {
  createDockContinuityEntry,
  createDockContinuityState,
  createDockReturnHandoff,
  createDockTopology,
  createDockTransaction,
  createDockTransactionState,
  getDockLocationKey,
  dockContinuityReducer,
  dockTransactionReducer,
  resolveDockContinuityEntry,
  resolveDockReturnHandoffs,
  resolveDockRoutePolicy,
  resolveDockTopologyPath,
  useDockContinuity,
  useDockTransactions,
  useRoutePrefetch,
} from "./routing";

export {
  canUseBottomLock,
  focusDockElement,
  getDockFocusableElements,
  shouldRestoreDockFocus,
} from "./behavior";

export {
  checkGuards,
  clearDockGuards,
  getDockGuardCount,
  registerGuard,
  useDockGuard,
} from "./guards";

export { resolveDockAttention, resolveDockScene, type DockScene } from "./attention";
export { deferUntilFull } from "./scheduler";

export {
  DockHeightSpacer,
  DockHud,
  DockSurfaceControls,
  DockSurfaceHeader,
  DockSurfaceHeaderButton,
  DockSurfaceShell,
  DockProvider,
  createDockMachineState,
  dockStateReducer,
} from "./provider";

export {
  useDockBehaviorState,
  useDockContextActions,
  useDockDimensions,
  useDockHeight,
  useDockHud,
  useDockHudState,
  useDockRouteState,
  useDockSurfaceState,
  useDock,
  useDockActions,
  useDockContext,
  useDockContinuityState,
  useDockOperations,
  useDockRuntimeHealth,
  useDockSelector,
  useDockState,
  useSurfaceReturn,
} from "./hooks";

export {
  createDockOperation,
  createDockOperationState,
  dockOperationReducer,
  resolveActiveDockOperation,
} from "./runtime";

export {
  defineBreadcrumb,
  defineHud,
  defineDockAction,
  defineStepSurface,
  defineSurface,
  useHud,
  useDockConfig,
  useDockBanner,
  useDockRegistration,
  useSurface,
  useSurfaceStep,
} from "./builder";
