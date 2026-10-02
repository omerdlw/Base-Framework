"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import Image, { type ImageProps } from "next/image";
import { useTheme } from "@omerdlw/base-framework/theme";
import { cn, trimToNull } from "@omerdlw/base-framework/utils";
import { primitivesTheme } from "./theme";
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
  const theme = useTheme(primitivesTheme);
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
          className={cn(theme.slots.adaptiveImageFallback, wrapperClassName)}
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
        className={cn(theme.slots.adaptiveImageFallback, wrapperClassName)}
        suppressHydrationWarning
      >
        {fallback}
      </div>
    );
  }

  const resolvedFill =
    fill !== undefined ? fill : !props.width && !props.height;

  const imageClassName = cn(theme.slots.adaptiveImage, className);
  const imageState = {
    "data-fill": resolvedFill || undefined,
    "data-state": hasLoaded ? "loaded" : "loading",
  };

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
        theme.slots.adaptiveImageFrame,
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
          {...imageState}
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
          {...imageState}
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
