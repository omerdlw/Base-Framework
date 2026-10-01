import { createElement as h } from "react";
import { errorThemeConfig } from "../../src/config/error.core.theme.ts";
import { primitivesThemeConfig } from "../../src/config/primitives.core.theme.ts";
import { ThemeProvider } from "../../src/core/theme.tsx";

export function withThemes(...extra) {
  const themes = [primitivesThemeConfig, errorThemeConfig, ...extra];
  return function Themed({ children }) {
    return h(ThemeProvider, { themes }, children);
  };
}

export const Themed = withThemes();
