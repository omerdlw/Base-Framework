"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { DockCardBanner } from "@/core/modules/dock";
import { useToast } from "@/core/modules/notification";
import { AdaptiveImage, Button, Icon, Input, Loader } from "@/core/primitives";
import { cn } from "@/core/utils";

import { useAccount } from "../../../provider";
import { updateAccountAction } from "../../../server/actions";
import { SUBMIT_BUTTON_CLASS } from "./index";

export interface AccountMediaForm {
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  backgroundUrl?: string | null;
  bannerPosition?: string | null;
}

export interface AccountMediaAccount {
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  backgroundUrl?: string | null;
  bannerPosition?: string | null;
  displayName?: string | null;
  username?: string | null;
}

export interface AccountMediaViewProps {
  closeAction?: (result?: { success: boolean }) => void;
  close?: (result?: { success: boolean }) => void;
  currentAccount?: AccountMediaAccount | null;
  form?: AccountMediaForm;
  formId?: string;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  onChange?: (key: keyof AccountMediaForm, value: string) => void;
}

interface ActionState {
  success: boolean;
  error?: string;
}

interface MediaSectionProps {
  icon: string;
  title: string;
  children: ReactNode;
}

const DEFAULT_BANNER_POSITION = "center 45%";

function MediaSection({ icon, title, children }: MediaSectionProps) {
  return <div className="flex flex-col gap-2.5">{children}</div>;
}

function MediaPreview({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-32 w-full items-center justify-center overflow-hidden rounded-[20px] bg-white/5">
      {children}
    </div>
  );
}

function UrlInput({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className="relative flex w-full items-center">
      <Input
        type="url"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-10 w-full rounded-[20px] bg-white/5 pl-4 text-sm text-white transition-colors duration-200 placeholder:text-white/50 hover:bg-white/10 focus:bg-white/10 focus:outline-none",
          value ? "pr-9" : "pr-4",
          className,
        )}
      />

      {value && (
        <Button
          type="button"
          disabled={disabled}
          onClick={() => onChange("")}
          aria-label="Clear input"
          className="center absolute right-1.5 size-7 cursor-pointer rounded-full p-0 text-white/50 transition-colors duration-200 hover:bg-white/10 hover:text-white active:scale-96"
        >
          <Icon icon="solar:close-bold" size={14} />
        </Button>
      )}
    </div>
  );
}

function getBannerPositionY(position: string) {
  const match = position.match(/(\d+)%/);
  return match ? Number(match[1]) : 45;
}

function BannerVerticalSlider({
  value,
  disabled = false,
  onChange,
}: {
  value: number;
  disabled?: boolean;
  onChange: (nextValue: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  const updateFromClientY = useCallback(
    (clientY: number) => {
      const track = trackRef.current;
      if (!track || disabled) return;
      const rect = track.getBoundingClientRect();
      if (rect.height <= 0) return;
      const ratio = (clientY - rect.top) / rect.height;
      const clamped = Math.min(100, Math.max(0, Math.round(ratio * 100)));
      onChange(clamped);
    },
    [disabled, onChange],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateFromClientY(event.clientY);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || !event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      return;
    }
    event.stopPropagation();
    updateFromClientY(event.clientY);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      onChange(Math.max(0, value - 5));
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      onChange(Math.min(100, value + 5));
    } else if (event.key === "Home") {
      event.preventDefault();
      onChange(0);
    } else if (event.key === "End") {
      event.preventDefault();
      onChange(100);
    }
  };

  return (
    <div
      role="slider"
      data-no-surface-drag="true"
      tabIndex={disabled ? -1 : 0}
      aria-label="Banner vertical alignment"
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      className={cn(
        "group/slider flex w-10 shrink-0 cursor-ns-resize flex-col items-center justify-between self-stretch rounded-[20px] bg-white/5 py-2.5 transition-colors duration-200 select-none touch-none hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <Icon
        icon="solar:alt-arrow-up-linear"
        size={12}
        className="shrink-0 text-white/50 transition-colors group-hover/slider:text-white/80"
      />
      <div
        ref={trackRef}
        className="relative my-1.5 w-1.5 flex-1 rounded-full bg-white/15"
      >
        <div
          className="w-full rounded-full bg-white/40"
          style={{ height: `${value}%` }}
        />
        <div
          className="absolute left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-150 group-hover/slider:scale-110"
          style={{ top: `${value}%` }}
        />
      </div>
      <Icon
        icon="solar:alt-arrow-down-linear"
        size={12}
        className="shrink-0 text-white/50 transition-colors group-hover/slider:text-white/80"
      />
    </div>
  );
}

export function AccountMediaView({
  closeAction,
  close,
  currentAccount,
  form,
  formId = "account-settings-media-form",
  onSubmit,
  onChange,
}: AccountMediaViewProps) {
  const accountState = useAccount();
  const router = useRouter();
  const toast = useToast();
  const handleClose = closeAction ?? close;

  const account =
    currentAccount ?? accountState?.account ?? accountState?.profile;

  const [avatarUrl, setAvatarUrl] = useState(
    form?.avatarUrl ?? account?.avatarUrl ?? "",
  );

  const [bannerUrl, setBannerUrl] = useState(
    form?.bannerUrl ?? account?.bannerUrl ?? "",
  );

  const [backgroundUrl, setBackgroundUrl] = useState(
    form?.backgroundUrl ?? account?.backgroundUrl ?? "",
  );

  const [bannerPosition, setBannerPosition] = useState(
    form?.bannerPosition ?? account?.bannerPosition ?? DEFAULT_BANNER_POSITION,
  );

  const updateField = (
    key: keyof AccountMediaForm,
    value: string,
    setter: (value: string) => void,
  ) => {
    setter(value);
    onChange?.(key, value);
  };

  const currentY = getBannerPositionY(bannerPosition);

  const [actionState, formAction, isPending] = useActionState<
    ActionState,
    FormData
  >(
    async () => {
      const result = await updateAccountAction({
        avatarUrl: avatarUrl.trim() || null,
        backgroundUrl: backgroundUrl.trim() || null,
        bannerPosition: bannerPosition.trim() || null,
        bannerUrl: bannerUrl.trim() || null,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || "Failed to update images",
        };
      }

      await accountState.refresh();

      return { success: true };
    },
    { success: false },
  );

  useEffect(() => {
    if (actionState.success) {
      toast("Gallery images updated successfully");
      router.refresh();
      handleClose?.({ success: true });

      return;
    }

    if (actionState.error) {
      toast(actionState.error);
    }
  }, [actionState, handleClose, router, toast]);

  const handleFormSubmit = onSubmit ?? undefined;

  return (
    <form
      id={formId}
      action={onSubmit ? undefined : formAction}
      onSubmit={handleFormSubmit}
      className="flex flex-col gap-2.5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <MediaSection icon="solar:user-circle-bold" title="Avatar">
          <MediaPreview>
            <div className="center relative size-20 shrink-0 overflow-hidden rounded-full bg-black/60 text-white/50 transition-transform hover:scale-105">
              {avatarUrl ? (
                <AdaptiveImage
                  alt="Avatar preview"
                  className="size-full object-cover"
                  src={avatarUrl}
                />
              ) : (
                <Icon icon="solar:user-circle-bold" size={24} />
              )}
            </div>
          </MediaPreview>

          <UrlInput
            value={avatarUrl}
            onChange={(value) => updateField("avatarUrl", value, setAvatarUrl)}
            disabled={isPending}
            placeholder="Avatar image URL"
          />
        </MediaSection>

        <MediaSection icon="solar:wallpaper-bold" title="Page Background">
          <MediaPreview>
            {backgroundUrl ? (
              <AdaptiveImage
                alt="Page background preview"
                className="size-full object-cover transition-transform hover:scale-105"
                src={backgroundUrl}
              />
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-xs text-white/50">
                <Icon
                  icon="solar:wallpaper-bold"
                  className="text-white/50"
                  size={24}
                />
              </div>
            )}
          </MediaPreview>

          <UrlInput
            value={backgroundUrl}
            onChange={(value) =>
              updateField("backgroundUrl", value, setBackgroundUrl)
            }
            disabled={isPending}
            placeholder="Page background URL"
          />
        </MediaSection>
      </div>

      <MediaSection icon="solar:widget-2-bold" title="Dock Banner">
        <div className="flex w-full items-stretch gap-2.5">
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <div className="relative flex h-[68px] w-full items-center justify-between overflow-hidden rounded-[30px] bg-black/60 p-2.5 ring-1 ring-inset ring-white/10 shadow-xl backdrop-blur-lg select-none">
              {bannerUrl && (
                <DockCardBanner
                  bannerUrl={bannerUrl}
                  bannerPosition={`center ${currentY}%`}
                  isActive
                />
              )}

              <div className="pointer-events-none relative z-10 flex w-full items-center justify-between gap-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="center relative size-12 shrink-0 overflow-hidden rounded-[20px] bg-white/5 text-white shadow-sm">
                    {avatarUrl ? (
                      <AdaptiveImage
                        alt="Preview avatar"
                        className="size-full object-cover"
                        src={avatarUrl}
                      />
                    ) : (
                      <Icon icon="solar:user-circle-bold" size={26} />
                    )}
                  </div>

                  <div className="flex min-w-0 flex-col justify-center gap-0.5">
                    <span className="truncate text-base font-semibold text-white leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                      {account?.displayName || "Your Name"}
                    </span>

                    <span className="truncate text-sm text-white/50 leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      @{account?.username || "username"}
                    </span>
                  </div>
                </div>

                <div className="mr-1.5 flex shrink-0 items-center gap-1">
                  <div className="center size-9 rounded-[14px] text-white/70 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    <Icon icon="solar:logout-2-bold" size={16} />
                  </div>

                  <div className="center size-9 rounded-[14px] text-white/70 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    <Icon icon="solar:settings-bold" size={16} />
                  </div>

                  <div className="center size-9 rounded-[14px] text-white/70 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    <Icon icon="solar:bell-bold" size={16} />
                  </div>
                </div>
              </div>
            </div>

            <UrlInput
              value={bannerUrl}
              onChange={(value) =>
                updateField("bannerUrl", value, setBannerUrl)
              }
              disabled={isPending}
              placeholder="Dock banner image URL"
            />
          </div>

          {bannerUrl && (
            <BannerVerticalSlider
              value={currentY}
              disabled={isPending}
              onChange={(nextY) =>
                updateField(
                  "bannerPosition",
                  `center ${nextY}%`,
                  setBannerPosition,
                )
              }
            />
          )}
        </div>
      </MediaSection>

      <Button
        type="submit"
        form={formId}
        disabled={isPending}
        className={SUBMIT_BUTTON_CLASS}
      >
        {isPending ? <Loader /> : "Save changes"}
      </Button>
    </form>
  );
}

export const SurfaceMediaForm = AccountMediaView;
