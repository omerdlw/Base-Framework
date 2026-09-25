import type { ReactNode } from "react";

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuLayout {
  wrapperRadius: number;
  wrapperPadding: number;
}

export interface ContextMenuClassNames {
  overlay?: string;
  content?: string;
  header?: string;
  headerIcon?: string;
  headerEyebrow?: string;
  headerTitle?: string;
  headerDescription?: string;
  separator?: string;
  item?: string;
  itemDanger?: string;
  itemIcon?: string;
  itemLabel?: string;
  itemShortcut?: string;
  [key: string]: any;
}

export interface ContextMenuPageMeta {
  description: ReactNode;
  descriptionText: string;
  eyebrow: ReactNode;
  icon: any;
  path: string;
  title: ReactNode;
  titleText: string;
}

export interface ContextMenuContextValue {
  currentTarget?: EventTarget | null;
  event?: any;
  pathname: string;
  point: ContextMenuPosition;
  target?: Element | null;
  payload?: any;
  page?: ContextMenuPageMeta | null;
  [key: string]: any;
}

export type ContextMenuItemType = "action" | "separator";

export interface ContextMenuItem {
  key?: string;
  type?: ContextMenuItemType | string;
  label?: ReactNode | ((context: ContextMenuContextValue) => ReactNode);
  icon?: any;
  itemIconClassName?: string;
  shortcut?:
    string | ((context: ContextMenuContextValue) => string | null) | null;
  danger?: boolean | ((context: ContextMenuContextValue) => boolean);
  disabled?: boolean | ((context: ContextMenuContextValue) => boolean);
  hidden?: boolean | ((context: ContextMenuContextValue) => boolean);
  visible?: boolean | ((context: ContextMenuContextValue) => boolean);
  closeOnSelect?: boolean;
  className?: string;
  onClick?: (
    event: any,
    context: ContextMenuContextValue,
  ) => void | Promise<void>;
  onSelect?: (
    event: any,
    context: ContextMenuContextValue,
  ) => void | Promise<void>;
  [key: string]: any;
}

export interface ContextMenuResolvedItem {
  key: string;
  type: ContextMenuItemType;
  label?: string;
  icon?: any;
  itemIconClassName?: string;
  shortcut?: string | null;
  danger?: boolean;
  disabled?: boolean;
  closeOnSelect?: boolean;
  className?: string;
  onClick?:
    | ((event: any, context: ContextMenuContextValue) => void | Promise<void>)
    | null;
  onSelect?:
    | ((event: any, context: ContextMenuContextValue) => void | Promise<void>)
    | null;
  [key: string]: any;
}

export type ContextMenuHeaderConfig =
  | {
      title?: ReactNode;
      description?: ReactNode;
      eyebrow?: ReactNode;
      icon?: any;
    }
  | false;

export interface ContextMenuResolvedHeader {
  description: ReactNode;
  descriptionText: string;
  eyebrow: ReactNode;
  icon: any;
  title: ReactNode;
  titleText: string;
}

export interface ContextMenuConfig {
  id?: string;
  path?: string | null;
  paths?: string[] | null;
  pathnames?: string[] | null;
  pathMatcher?: (path: string) => boolean;
  target?: string | string[] | null;
  items?:
    | (ContextMenuItem | "separator")[]
    | ((context: ContextMenuContextValue) => (ContextMenuItem | "separator")[]);
  onOpen?: (
    event: any,
    context: ContextMenuContextValue,
  ) => boolean | object | void;
  onClose?: (context: ContextMenuContextValue) => void;
  classNames?: ContextMenuClassNames;
  priority?: number;
  enabled?: boolean | ((context: ContextMenuContextValue) => boolean);
  when?:
    | boolean
    | ((
        event: any,
        info: {
          pathname: string;
          target: Element | null;
          context: ContextMenuContextValue;
        },
      ) => boolean);
  payload?: any;
  resolvePayload?: (event: any, context: ContextMenuContextValue) => any;
  resolveContext?: (
    event: any,
    context: ContextMenuContextValue,
  ) => Record<string, any>;
  header?:
    | ContextMenuHeaderConfig
    | ((context: ContextMenuContextValue) => ContextMenuHeaderConfig);
  showPageHeader?: boolean;
  menus?: ContextMenuConfig[];
  [key: string]: any;
}

export interface ContextMenuCandidate {
  registryKey: string;
  config: ContextMenuConfig;
  order: number;
}

export interface ContextMenuResolvedMatch {
  config: ContextMenuConfig;
  context: ContextMenuContextValue;
  items: ContextMenuResolvedItem[];
  score: number;
  order: number;
}

export interface ContextMenuState {
  config: ContextMenuConfig | null;
  context: ContextMenuContextValue | null;
  isOpen: boolean;
  items: ContextMenuResolvedItem[];
  position: ContextMenuPosition;
}

export interface ContextMenuTriggerBindings {
  onContextMenu: (event: any) => void;
}

export interface ContextMenuActions {
  openMenu: (configOrState: any, x?: number, y?: number) => void;
  closeMenu: () => void;
  bind?: (
    payload?: any,
    configOverride?: Partial<ContextMenuConfig>,
  ) => ContextMenuTriggerBindings;
}

export type ContextMenuContextApi = ContextMenuState &
  ContextMenuActions & {
    bind: (
      payload?: any,
      configOverride?: Partial<ContextMenuConfig>,
    ) => ContextMenuTriggerBindings;
  };

export interface ContextMenuMetrics {
  headerIconRadius: number;
  itemRadius: number;
  wrapperPadding: number;
  wrapperRadius: number;
}

export interface ContextMenuDefinition {
  config: Partial<ContextMenuConfig>;
  id: string;
  use: (options?: Partial<ContextMenuConfig>) => ContextMenuContextApi;
}
