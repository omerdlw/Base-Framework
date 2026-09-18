"use client";

import {
  createContext,
  memo,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  NAV_BREADCRUMBS_TRANSITION,
  NAV_COMPOSITOR_STYLE,
  navBreadcrumbsVariants,
} from "./motion";
import { formatSlugTitle, normalizePath } from "./routing";
import { cn } from "@/core/utils";
import Iconify from "@/core/primitives/icon";

const IconifyComponent = Iconify as any;

function useRequiredContext<T>(
  context: React.Context<T | null>,
  hookName: string,
  providerName: string,
): T {
  const value = use(context);
  if (value === null) {
    throw new Error(`${hookName} must be used within ${providerName}`);
  }
  return value;
}

function formatPath(path: string | null): string {
  return normalizePath(path) || "/";
}

const stopPropagationOnly = (event: React.MouseEvent) =>
  event.stopPropagation();

function createRootBreadcrumb(root: any, isCurrent: boolean) {
  return {
    id: root?.id || "home",
    title: root?.title || "Home",
    path: root?.path || "/",
    icon: root?.icon || null,
    isCurrent,
    level: 0,
  };
}

function createGenericBreadcrumbs(
  segments: string[],
  overrides: Record<string, any>,
  resolveSegment?: (arg: any) => any,
) {
  let currentPath = "";
  const results = [];
  const len = segments.length;

  for (let index = 0; index < len; index++) {
    const segment = segments[index];
    currentPath += `/${segment}`;

    const fallback = {
      id: `segment-${segment}-${index}`,
      title: formatSlugTitle(segment),
      path: currentPath,
      icon: null,
      isCurrent: index === len - 1,
      level: index + 1,
    };

    const resolvedSegment = resolveSegment
      ? resolveSegment({ ...fallback, index, segment, segments })
      : null;
    const override = overrides[currentPath];

    results.push(
      Object.assign(
        fallback,
        resolvedSegment && typeof resolvedSegment === "object"
          ? resolvedSegment
          : null,
        override || null,
      ),
    );
  }
  return results;
}

export function resolveRouteBreadcrumbs(
  pathname = "",
  overrides: Record<string, any> = {},
  config: Record<string, any> = {},
) {
  const normalizedPath = normalizePath(pathname) || "/";
  const rootBreadcrumb = createRootBreadcrumb(
    config.root,
    normalizedPath === "/",
  );

  if (normalizedPath === "/") return [rootBreadcrumb];

  const segments = normalizedPath.split("/").filter(Boolean);
  if (segments.length === 0) return [rootBreadcrumb];

  if (typeof config.resolvePath === "function") {
    const resolvedPath = config.resolvePath({
      overrides,
      pathname: normalizedPath,
      root: rootBreadcrumb,
      segments,
    });
    if (Array.isArray(resolvedPath)) {
      return [rootBreadcrumb, ...resolvedPath];
    }
  }

  const generated = createGenericBreadcrumbs(
    segments,
    overrides,
    config.resolveSegment,
  );

  generated.unshift(rootBreadcrumb);
  return generated;
}

const BreadcrumbStateContext = createContext<Record<string, any> | null>(null);
const BreadcrumbActionsContext = createContext<{
  registerOverride: (path: string, overrideConfig: any) => void;
  unregisterOverride: (path: string) => void;
} | null>(null);
const EMPTY_BREADCRUMB_CONFIG: Record<string, any> = {};
const BreadcrumbConfigContext = createContext<Record<string, any>>(
  EMPTY_BREADCRUMB_CONFIG,
);

export function BreadcrumbProvider({
  children,
  config = null,
}: {
  children?: ReactNode;
  config?: any;
}) {
  const [overrides, setOverrides] = useState<Record<string, any>>({});

  const registerOverride = useCallback((path: string, overrideConfig: any) => {
    if (!path || !overrideConfig) return;
    const normalizedPath = formatPath(path);

    setOverrides((currentOverrides) => {
      const existing = currentOverrides[normalizedPath];
      if (
        existing?.title === overrideConfig.title &&
        existing?.icon === overrideConfig.icon
      ) {
        return currentOverrides;
      }
      return {
        ...currentOverrides,
        [normalizedPath]: {
          title: overrideConfig.title || null,
          icon: overrideConfig.icon || null,
        },
      };
    });
  }, []);

  const unregisterOverride = useCallback((path: string) => {
    if (!path) return;
    const normalizedPath = formatPath(path);

    setOverrides((currentOverrides) => {
      if (!currentOverrides[normalizedPath]) return currentOverrides;
      const { [normalizedPath]: _, ...nextOverrides } = currentOverrides;
      return nextOverrides;
    });
  }, []);

  const actions = useMemo(
    () => ({ registerOverride, unregisterOverride }),
    [registerOverride, unregisterOverride],
  );

  return (
    <BreadcrumbConfigContext value={config || EMPTY_BREADCRUMB_CONFIG}>
      <BreadcrumbActionsContext value={actions}>
        <BreadcrumbStateContext value={overrides}>
          {children}
        </BreadcrumbStateContext>
      </BreadcrumbActionsContext>
    </BreadcrumbConfigContext>
  );
}

export function useBreadcrumbOverrides() {
  return useRequiredContext(
    BreadcrumbStateContext,
    "useBreadcrumbOverrides",
    "BreadcrumbProvider",
  );
}

export function useBreadcrumbActions() {
  return useRequiredContext(
    BreadcrumbActionsContext,
    "useBreadcrumbActions",
    "BreadcrumbProvider",
  );
}

export function useNavBreadcrumbs() {
  const pathname = usePathname();
  const router = useRouter();
  const overrides = useBreadcrumbOverrides();
  const config = use(BreadcrumbConfigContext);

  const breadcrumbs = useMemo(
    () => resolveRouteBreadcrumbs(pathname || "", overrides, config || {}),
    [config, pathname, overrides],
  );

  const len = breadcrumbs.length;
  const current = len > 0 ? breadcrumbs[len - 1] : null;
  const parent = len > 1 ? breadcrumbs[len - 2] : null;
  const canGoBack = len > 1;

  const goBack = useCallback(() => {
    if (parent?.path) router.push(parent.path);
    else router.back();
  }, [parent, router]);

  return { breadcrumbs, canGoBack, current, goBack, parent };
}

export function useRegisterBreadcrumbOverride({
  icon = null,
  path,
  title = null,
}: {
  icon?: any;
  path?: string;
  title?: string | null;
} = {}) {
  const { registerOverride, unregisterOverride } = useBreadcrumbActions();

  useEffect(() => {
    if (!path || (!title && !icon)) return;

    registerOverride(path, { title, icon });
    return () => unregisterOverride(path);
  }, [icon, path, registerOverride, title, unregisterOverride]);
}

export const NavBreadcrumbsCard = memo(function NavBreadcrumbsCard({
  className = "",
  maxItems = 4,
}: {
  className?: string;
  maxItems?: number;
}) {
  const { breadcrumbs } = useNavBreadcrumbs();

  if (!breadcrumbs || breadcrumbs.length <= 1) return null;

  const itemsToRender =
    breadcrumbs.length > maxItems
      ? [
          breadcrumbs[0],
          { id: "ellipsis", title: "...", isEllipsis: true },
          ...breadcrumbs.slice(-2),
        ]
      : breadcrumbs;

  return (
    <motion.div
      variants={navBreadcrumbsVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={NAV_BREADCRUMBS_TRANSITION}
      style={NAV_COMPOSITOR_STYLE}
      className={cn(
        "absolute inset-x-0 top-[calc(100%+4px)] z-10 flex h-[40px] w-full items-center justify-center rounded-[20px] bg-black/60 px-4 text-xs ring-1 ring-white/10 select-none ring-inset",
        className,
      )}
      onClick={stopPropagationOnly}
    >
      <nav
        aria-label="Breadcrumbs"
        className="flex scrollbar-none items-center gap-1.5 overflow-x-auto"
      >
        {itemsToRender.map((crumb, index) => {
          const isLast = index === itemsToRender.length - 1;

          if (crumb.isEllipsis) {
            return (
              <span key="ellipsis" className="px-0.5 text-white/50 select-none">
                ...
              </span>
            );
          }

          return (
            <motion.div
              layout="position"
              key={crumb.id || crumb.path}
              className="flex items-center gap-1.5"
            >
              {isLast ? (
                <span className="max-w-[180px] truncate font-medium text-white">
                  {crumb.title}
                </span>
              ) : (
                <Link
                  href={crumb.path}
                  className="max-w-[140px] truncate text-white/70 hover:text-white"
                >
                  {crumb.title}
                </Link>
              )}

              {!isLast && (
                <IconifyComponent
                  icon="solar:alt-arrow-right-linear"
                  size={10}
                  className="shrink-0 text-white/50"
                />
              )}
            </motion.div>
          );
        })}
      </nav>
    </motion.div>
  );
});
