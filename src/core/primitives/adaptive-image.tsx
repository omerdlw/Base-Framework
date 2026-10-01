"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import Image, { type ImageProps } from "next/image";
import { cn, trimToNull } from "@/core/utils";
import { AdaptiveImageProps } from "./types";

function AdaptiveImage({
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
    "transition-opacity duration-micro ease-out-quart",
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
