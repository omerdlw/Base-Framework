"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import Image, { type ImageProps } from "next/image";
import { cn, trimToNull } from "@/core/utils";

export interface AdaptiveImageProps
  extends Omit<
    ComponentPropsWithoutRef<"img">,
    "src" | "alt" | "placeholder"
  > {
  mode?: "img" | "next";
  src?: string | null;
  alt?: string;
  className?: string;
  wrapperClassName?: string;
  skeletonClassName?: string;
  fallback?: ReactNode;
  fill?: boolean;
  priority?: boolean;
  preload?: boolean;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  onLoad?: (event: SyntheticEvent<HTMLImageElement, Event>) => void;
  onError?: (event: SyntheticEvent<HTMLImageElement, Event>) => void;
  decoding?: "async" | "auto" | "sync";
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
  quality?: number | string;
  sizes?: string;
}

export type Props = AdaptiveImageProps;

export default function AdaptiveImage({
  mode = "img",
  src,
  alt = "",
  className = "",
  wrapperClassName = "",
  skeletonClassName = "",
  fallback,
  fill,
  priority = false,
  preload = false,
  loading,
  fetchPriority,
  onLoad,
  onError,
  decoding = "async",
  ...props
}: AdaptiveImageProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const resolvedSrc = trimToNull(src);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    const imageElement = imageRef.current;
    if (
      imageElement &&
      imageElement.complete &&
      imageElement.naturalWidth > 0
    ) {
      setHasLoaded(true);
      setHasFailed(false);
    } else {
      setHasLoaded(false);
      setHasFailed(false);
    }
  }, [resolvedSrc]);

  if (!resolvedSrc) {
    if (fallback) {
      return (
        <div
          className={cn(
            "relative h-full w-full overflow-hidden select-none",
            wrapperClassName,
          )}
          suppressHydrationWarning
        >
          {fallback}
        </div>
      );
    }
    return null;
  }

  if (hasFailed && fallback) {
    return (
      <div
        className={cn(
          "relative h-full w-full overflow-hidden select-none",
          wrapperClassName,
        )}
        suppressHydrationWarning
      >
        {fallback}
      </div>
    );
  }

  const resolvedFill =
    fill !== undefined ? fill : !props.width && !props.height;

  const imageClassName = cn(
    resolvedFill
      ? "absolute inset-0 h-full w-full select-none"
      : "h-full w-full",
    "transition-opacity duration-200 ease-out",
    hasLoaded ? "opacity-100" : "opacity-0",
    className,
  );

  const resolvedLoading = loading || (priority ? "eager" : "lazy");
  const resolvedFetchPriority =
    fetchPriority || (priority ? "high" : undefined);

  const handleLoad = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    setHasLoaded(true);
    setHasFailed(false);
    onLoad?.(event);
  };

  const handleError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    setHasFailed(true);
    onError?.(event);
  };

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden bg-white/5 select-none",
        skeletonClassName,
        wrapperClassName,
      )}
      suppressHydrationWarning
    >
      {mode === "img" ? (
        <img
          ref={imageRef}
          src={resolvedSrc}
          alt={alt}
          draggable={false}
          onDragStart={(event) => event.preventDefault()}
          className={imageClassName}
          onLoad={handleLoad}
          onError={handleError}
          loading={resolvedLoading}
          fetchPriority={resolvedFetchPriority}
          decoding={decoding}
          suppressHydrationWarning
          {...props}
        />
      ) : (
        <Image
          ref={imageRef}
          src={resolvedSrc}
          alt={alt}
          fill={resolvedFill}
          preload={preload}
          draggable={false}
          onDragStart={(event) => event.preventDefault()}
          loading={resolvedLoading}
          fetchPriority={resolvedFetchPriority}
          decoding={decoding}
          className={imageClassName}
          onLoad={handleLoad}
          onError={handleError}
          suppressHydrationWarning
          {...(props as unknown as Partial<ImageProps>)}
        />
      )}
    </div>
  );
}

AdaptiveImage.displayName = "AdaptiveImage";
export { AdaptiveImage };
