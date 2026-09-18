"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { REGISTRY_TYPES, useRegistryEntries } from "@/core/orchestration";
import { Z_INDEX } from "@/core/tokens";
import { CONTROLS_RAIL_GAP } from "./constants";
import type { ControlEntry, ControlsLayout, ControlsSideProps } from "./types";
import {
  areLayoutsEqual,
  getControlsLayoutSnapshot,
  getNavElement,
  hasControls,
  resolveControlsPairs,
} from "./utils";

export function useControlsLayout(): ControlsLayout | null {
  const [layout, setLayout] = useState<ControlsLayout | null>(null);
  useEffect(() => {
    let observedNavElement: Element | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const updateLayout = () => {
      const next = getControlsLayoutSnapshot();
      setLayout((prev) => (areLayoutsEqual(prev, next) ? prev : next));
    };
    const observeNavElement = () => {
      const navElement = getNavElement();
      if (navElement !== observedNavElement) {
        resizeObserver?.disconnect();
        observedNavElement = navElement;
        if (navElement && typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(updateLayout);
          resizeObserver.observe(navElement);
        }
        updateLayout();
      }
    };
    const mutationObserver = new MutationObserver(observeNavElement);
    mutationObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-controls-anchor", "data-controls-hidden"],
      childList: true,
      subtree: true,
    });
    observeNavElement();
    window.addEventListener("resize", updateLayout);
    return () => {
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateLayout);
    };
  }, []);
  return layout;
}

export function ControlsSide({ controls, geometry, side }: ControlsSideProps) {
  if (!hasControls(controls) || !geometry?.height || !geometry?.maxWidth)
    return null;
  const positionStyle: CSSProperties =
    side === "left"
      ? {
          bottom: geometry.bottom,
          maxWidth: geometry.maxWidth,
          right: geometry.right,
        }
      : {
          bottom: geometry.bottom,
          left: geometry.left,
          maxWidth: geometry.maxWidth,
        };
  return (
    <aside
      aria-label={`${side === "left" ? "Left" : "Right"} page controls`}
      className="pointer-events-none fixed hidden w-max max-w-[calc(100vw-8px)] sm:block"
      style={{
        ...positionStyle,
        zIndex: Z_INDEX.NAV,
      }}
    >
      <div
        className={`pointer-events-auto flex w-max max-w-full flex-col-reverse ${side === "left" ? "items-end" : "items-start"}`}
        style={
          {
            "--controls-height": `${geometry.height}px`,
            rowGap: `${CONTROLS_RAIL_GAP}px`,
          } as CSSProperties
        }
      >
        {controls.map(({ content, id }, index) => (
          <Fragment key={id || index}>{content}</Fragment>
        ))}
      </div>
    </aside>
  );
}

const emptySubscribe = () => () => {};

export function Controls() {
  const portalTarget = useSyncExternalStore(
    emptySubscribe,
    () => (typeof document !== "undefined" ? document.body : null),
    () => null,
  );
  const layout = useControlsLayout();
  const pathname = usePathname();
  const entries = useRegistryEntries(REGISTRY_TYPES.CONTROLS) as ControlEntry[];
  const { left, right } = useMemo(
    () => resolveControlsPairs(entries, pathname),
    [entries, pathname],
  );
  if (!portalTarget || !layout || layout.isHidden || !hasControls(left)) {
    return null;
  }
  return createPortal(
    <>
      <ControlsSide
        controls={left}
        geometry={{
          ...layout.left,
          bottom: layout.bottom,
          height: layout.height,
        }}
        side="left"
      />
      <ControlsSide
        controls={right}
        geometry={{
          ...layout.right,
          bottom: layout.bottom,
          height: layout.height,
        }}
        side="right"
      />
    </>,
    portalTarget,
  );
}

export default Controls;
