import { ambientModule } from "./ambient/module";
import { backgroundModule } from "./background/module";
import { contextMenuModule } from "./context-menu/module";
import { controlsModule } from "./controls/module";
import { dockModule } from "./dock/module";
import { loadingModule } from "./loading/module";
import { modalModule } from "./modal/module";
import { notificationModule } from "./notification/module";

export {
  ambientModule,
  backgroundModule,
  contextMenuModule,
  controlsModule,
  dockModule,
  loadingModule,
  modalModule,
  notificationModule,
};

export const defaultModules = Object.freeze([
  backgroundModule,
  ambientModule,
  dockModule,
  controlsModule,
  contextMenuModule,
  loadingModule,
  modalModule,
  notificationModule,
] as const);
