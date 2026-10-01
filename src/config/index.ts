import { ambientThemeConfig } from "./ambient.module.theme";
import { backgroundThemeConfig } from "./background.module.theme";
import { errorThemeConfig } from "./error.core.theme";
import { primitivesThemeConfig } from "./primitives.core.theme";
import { contextMenuThemeConfig } from "./context-menu.module.theme";
import { controlsThemeConfig } from "./controls.module.theme";
import { dockThemeConfig } from "./dock.module.theme";
import { loadingThemeConfig } from "./loading.module.theme";
import { modalThemeConfig } from "./modal.module.theme";
import { notificationThemeConfig } from "./notification.module.theme";

export { project } from "./project";

export const themes = Object.freeze([
  errorThemeConfig,
  primitivesThemeConfig,
  ambientThemeConfig,
  backgroundThemeConfig,
  contextMenuThemeConfig,
  controlsThemeConfig,
  dockThemeConfig,
  loadingThemeConfig,
  modalThemeConfig,
  notificationThemeConfig,
]);
