"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useControllableState, useEscapeKey } from "@/core/hooks";
import { Z_INDEX } from "@/core/tokens";
import { useTheme } from "@/core/theme";
import { cn } from "@/core/utils";
import { primitivesTheme } from "./theme";
import { Icon } from "./icon";
import { resolveSlotClasses } from "./utils";
import { SelectClassNames, SelectOption, SelectProps } from "./types";

function Select<T extends string = string>({
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
  const theme = useTheme(primitivesTheme);
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
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
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
      className={cn(
        "relative inline-flex w-full flex-col gap-1.5",
        classes.root,
        classes.default,
      )}
    >
      {label ? (
        <label
          htmlFor={triggerId}
          className={cn(theme.slots.selectLabel, classes.label)}
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
          "flex w-full items-center justify-between gap-2 text-left transition-colors duration-micro ease-out-quart",
          theme.slots.selectTrigger,
          classes.trigger,
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {selectedOption?.icon ? (
            <Icon
              icon={selectedOption.icon}
              size={16}
              className={cn(
                "shrink-0",
                theme.slots.selectOptionIcon,
                classes.optionIcon,
              )}
            />
          ) : null}
          {selectedOption ? (
            <span className={cn("truncate", classes.value)}>
              {selectedOption.label}
            </span>
          ) : (
            <span
              className={cn(
                "truncate",
                theme.slots.selectPlaceholder,
                classes.placeholder,
              )}
            >
              {placeholder}
            </span>
          )}
        </span>

        <Icon
          icon="solar:alt-arrow-down-linear"
          size={16}
          className={cn(
            "shrink-0 transition-transform ease-out-quart duration-micro",
            theme.slots.selectChevron,
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
            "absolute top-full left-0 w-full overflow-y-auto",
            theme.slots.selectContent,
            classes.content,
          )}
        >
          {options.length === 0 ? (
            <div className={cn(theme.slots.selectEmpty, classes.empty)}>
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
                    "flex cursor-pointer items-center justify-between gap-2.5 transition-colors duration-micro ease-out-quart select-none",
                    theme.slots.selectOption,
                    isHighlighted &&
                      cn(theme.slots.selectOptionActive, classes.optionActive),
                    isSelected &&
                      cn(
                        theme.slots.selectOptionSelected,
                        classes.optionSelected,
                      ),
                    option.disabled &&
                      cn(
                        "cursor-not-allowed",
                        theme.slots.selectOptionDisabled,
                      ),
                    classes.option,
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    {option.icon ? (
                      <Icon
                        icon={option.icon}
                        size={16}
                        className={cn(
                          "shrink-0",
                          theme.slots.selectOptionIcon,
                          classes.optionIcon,
                        )}
                      />
                    ) : null}
                    <span className="flex min-w-0 flex-col">
                      <span className={cn("truncate", classes.optionLabel)}>
                        {option.label}
                      </span>
                      {option.description ? (
                        <span
                          className={cn(
                            "truncate",
                            theme.slots.selectOptionDescription,
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
                      className={cn("shrink-0", theme.slots.selectCheck)}
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

Select.displayName = "Select";
export { Select };
