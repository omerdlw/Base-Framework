import { defineThemeSpec } from "@/core/theme";

export type ErrorThemeSlot = "container" | "iconBox" | "title" | "button";

export const errorTheme = defineThemeSpec<ErrorThemeSlot>("error");
