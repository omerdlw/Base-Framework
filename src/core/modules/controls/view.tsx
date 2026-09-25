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
  getDockElement,
  hasControls,
  resolveControlsPairs,
} from "./utils";

export function useControlsLayout(): ControlsLayout | null {
  const [layout, setLayout] = useState<ControlsLayout | null>(null);
  useEffect(() => {
    let observedDockElement: Element | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let isObservingBody = false;

    const updateLayout = () => {
      const next = getControlsLayoutSnapshot();
      setLayout((prev) => (areLayoutsEqual(prev, next) ? prev : next));
    };

    const mutationObserver = new MutationObserver(() => {
      observeDockElement();
    });

    const observeDockElement = () => {
      const dockElement = getDockElement();
      if (dockElement !== observedDockElement) {
        resizeObserver?.disconnect();
        mutationObserver.disconnect();
        isObservingBody = false;
        observedDockElement = dockElement;

        if (dockElement) {
          if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(updateLayout);
            resizeObserver.observe(dockElement);
          }
          mutationObserver.observe(dockElement, {
            attributes: true,
            attributeFilter: ["data-controls-anchor", "data-controls-hidden"],
          });
          if (dockElement.parentElement) {
            mutationObserver.observe(dockElement.parentElement, {
              childList: true,
            });
          }
        } else {
          isObservingBody = true;
          mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
          });
        }
        updateLayout();
      } else if (!dockElement && !isObservingBody) {
        isObservingBody = true;
        mutationObserver.observe(document.body, {
          childList: true,
          subtree: true,
        });
      } else if (dockElement) {
        updateLayout();
      }
    };

    observeDockElement();
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
        zIndex: Z_INDEX.DOCK,
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
