"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useControllableState, useEscapeKey } from "@/core/hooks";
import { Z_INDEX } from "@/core/tokens";
import { cn } from "@/core/utils";
import Icon from "./icon";
import { resolveSlotClasses } from "./utils";

export interface SelectOption<T extends string = string> {
  description?: ReactNode;
  disabled?: boolean;
  icon?: string;
  label: ReactNode;
  value: T;
}

export interface SelectClassNames {
  chevron?: string;
  content?: string;
  default?: string;
  description?: string;
  empty?: string;
  label?: string;
  option?: string;
  optionActive?: string;
  optionDescription?: string;
  optionIcon?: string;
  optionLabel?: string;
  optionSelected?: string;
  placeholder?: string;
  root?: string;
  trigger?: string;
  value?: string;
}

export interface SelectProps<T extends string = string> {
  ariaLabel?: string;
  className?: string;
  classNames?: SelectClassNames | string;
  defaultOpen?: boolean;
  defaultValue?: T;
  disabled?: boolean;
  emptyMessage?: ReactNode;
  id?: string;
  label?: ReactNode;
  name?: string;
  onChange?: (value: T, option: SelectOption<T>) => void;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  options: readonly SelectOption<T>[];
  placeholder?: ReactNode;
  value?: T;
}

export function Select<T extends string = string>({
  ariaLabel,
  className,
  classNames,
  defaultOpen = false,
  defaultValue,
  disabled = false,
  emptyMessage = "No options available",
  id,
  label,
  name,
  onChange,
  onOpenChange,
  open: openProp,
  options,
  placeholder = "Select an option...",
  value: valueProp,
}: SelectProps<T>) {
  const generatedId = useId();
  const triggerId = id || `select-trigger-${generatedId}`;
  const listboxId = `select-listbox-${generatedId}`;
  const classes = resolveSlotClasses<SelectClassNames>(className, classNames);

  const [selectedValue, setSelectedValue] = useControllableState<T | undefined>(
    {
      defaultValue,
      value: valueProp,
    },
  );

  const [isOpen, setIsOpen] = useControllableState<boolean>({
    defaultValue: defaultOpen,
    onChange: onOpenChange,
    value: openProp,
  });

  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === selectedValue) ?? null,
    [options, selectedValue],
  );

  const enabledIndices = useMemo(
    () =>
      options
        .map((opt, idx) => (opt.disabled ? -1 : idx))
        .filter((idx) => idx !== -1),
    [options],
  );

  const closeSelect = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  useEscapeKey(() => {
    if (isOpen) {
      closeSelect();
      triggerRef.current?.focus();
    }
  }, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDownOutside = (event: MouseEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        closeSelect();
      }
    };
    document.addEventListener("mousedown", handlePointerDownOutside);
    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
    };
  }, [closeSelect, isOpen]);

  const handleSelectOption = useCallback(
    (option: SelectOption<T>) => {
      if (option.disabled || disabled) return;
      setSelectedValue(option.value);
      onChange?.(option.value, option);
      closeSelect();
      triggerRef.current?.focus();
    },
    [closeSelect, disabled, onChange, setSelectedValue],
  );

  const handleTriggerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          const currentSelectedIdx = options.findIndex(
            (o) => o.value === selectedValue && !o.disabled,
          );
          setHighlightedIndex(
            currentSelectedIdx >= 0
              ? currentSelectedIdx
              : (enabledIndices[0] ?? -1),
          );
          return;
        }

        if (enabledIndices.length === 0) return;
        const currentPos = enabledIndices.indexOf(highlightedIndex);
        if (event.key === "ArrowDown") {
          const nextPos =
            currentPos < 0 || currentPos >= enabledIndices.length - 1
              ? 0
              : currentPos + 1;
          setHighlightedIndex(enabledIndices[nextPos]);
        } else {
          const prevPos =
            currentPos <= 0 ? enabledIndices.length - 1 : currentPos - 1;
          setHighlightedIndex(enabledIndices[prevPos]);
        }
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (isOpen) {
          const candidate = options[highlightedIndex];
          if (candidate && !candidate.disabled) {
            handleSelectOption(candidate);
          } else {
            closeSelect();
          }
        } else {
          setIsOpen(true);
          const currentSelectedIdx = options.findIndex(
            (o) => o.value === selectedValue && !o.disabled,
          );
          setHighlightedIndex(
            currentSelectedIdx >= 0
              ? currentSelectedIdx
              : (enabledIndices[0] ?? -1),
          );
        }
      }
    },
    [
      closeSelect,
      disabled,
      enabledIndices,
      handleSelectOption,
      highlightedIndex,
      isOpen,
      options,
      selectedValue,
      setIsOpen,
    ],
  );

  return (
    <div
      ref={rootRef}
      className={cn("relative inline-flex w-full flex-col gap-1.5", classes.root, classes.default)}
    >
      {label ? (
        <label
          htmlFor={triggerId}
          className={cn("text-xs font-medium text-white/75", classes.label)}
        >
          {label}
        </label>
      ) : null}

      {name ? (
        <input type="hidden" name={name} value={selectedValue ?? ""} />
      ) : null}

      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          if (nextOpen) {
            const currentSelectedIdx = options.findIndex(
              (o) => o.value === selectedValue && !o.disabled,
            );
            setHighlightedIndex(
              currentSelectedIdx >= 0
                ? currentSelectedIdx
                : (enabledIndices[0] ?? -1),
            );
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl bg-white/5 px-3.5 py-2.5 text-left text-sm text-white ring-1 ring-white/10 transition-colors ring-inset hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45",
          classes.trigger,
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {selectedOption?.icon ? (
            <Icon
              icon={selectedOption.icon}
              size={16}
              className={cn("shrink-0 text-white/75", classes.optionIcon)}
            />
          ) : null}
          {selectedOption ? (
            <span className={cn("truncate", classes.value)}>
              {selectedOption.label}
            </span>
          ) : (
            <span className={cn("truncate text-white/45", classes.placeholder)}>
              {placeholder}
            </span>
          )}
        </span>

        <Icon
          icon="solar:alt-arrow-down-linear"
          size={16}
          className={cn(
            "shrink-0 text-white/50 transition-transform duration-200",
            isOpen && "rotate-180",
            classes.chevron,
          )}
        />
      </button>

      {isOpen ? (
        <div
          id={listboxId}
          role="listbox"
          style={{ zIndex: Z_INDEX.SELECT }}
          className={cn(
            "absolute top-full left-0 mt-1.5 max-h-64 w-full overflow-y-auto rounded-2xl bg-black/90 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.55)] ring-1 ring-white/10 backdrop-blur-xl ring-inset",
            classes.content,
          )}
        >
          {options.length === 0 ? (
            <div
              className={cn(
                "px-3 py-2 text-center text-xs text-white/45",
                classes.empty,
              )}
            >
              {emptyMessage}
            </div>
          ) : (
            options.map((option, index) => {
              const isSelected = option.value === selectedValue;
              const isHighlighted = index === highlightedIndex;
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled}
                  onMouseEnter={() => {
                    if (!option.disabled) setHighlightedIndex(index);
                  }}
                  onClick={() => handleSelectOption(option)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-sm text-white/85 transition-colors select-none",
                    isHighlighted &&
                      cn("bg-white/10 text-white", classes.optionActive),
                    isSelected &&
                      cn("font-medium text-white", classes.optionSelected),
                    option.disabled && "cursor-not-allowed opacity-40",
                    classes.option,
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    {option.icon ? (
                      <Icon
                        icon={option.icon}
                        size={16}
                        className={cn("shrink-0 text-white/75", classes.optionIcon)}
                      />
                    ) : null}
                    <span className="flex min-w-0 flex-col">
                      <span className={cn("truncate", classes.optionLabel)}>
                        {option.label}
                      </span>
                      {option.description ? (
                        <span
                          className={cn(
                            "truncate text-xs text-white/50",
                            classes.optionDescription,
                          )}
                        >
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                  </span>

                  {isSelected ? (
                    <Icon
                      icon="solar:check-read-linear"
                      size={16}
                      className="shrink-0 text-white"
                    />
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

export default Select;
