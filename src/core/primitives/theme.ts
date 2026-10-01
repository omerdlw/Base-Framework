import { defineThemeSpec } from "@/core/theme";

export type PrimitivesThemeSlot =
  | "avatar"
  | "avatarFallback"
  | "badge"
  | "button"
  | "checkbox"
  | "input"
  | "progress"
  | "progressIndicator"
  | "selectCheck"
  | "selectChevron"
  | "selectContent"
  | "selectEmpty"
  | "selectLabel"
  | "selectOption"
  | "selectOptionActive"
  | "selectOptionDescription"
  | "selectOptionDisabled"
  | "selectOptionIcon"
  | "selectOptionSelected"
  | "selectPlaceholder"
  | "selectTrigger"
  | "separator"
  | "skeleton"
  | "switch"
  | "switchThumb"
  | "switchThumbOff"
  | "switchThumbOn"
  | "textarea";

export const primitivesTheme =
  defineThemeSpec<PrimitivesThemeSlot>("primitives");
