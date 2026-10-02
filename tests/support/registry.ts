import {
  createModuleRegistryDefinitions,
  createRegistryOperations,
  createRegistryStore as createStoreWith,
} from "@omerdlw/base-framework/kernel";
import { backgroundModule } from "@omerdlw/base-framework/modules/background";
import { contextMenuModule } from "@omerdlw/base-framework/modules/context-menu";
import { controlsModule } from "@omerdlw/base-framework/modules/controls";
import { dockModule } from "@omerdlw/base-framework/modules/dock";
import { loadingModule } from "@omerdlw/base-framework/modules/loading";
import { mediaModule } from "@omerdlw/base-framework/modules/media";
import { modalModule } from "@omerdlw/base-framework/modules/modal";

export const builtInModules = Object.freeze([
  backgroundModule,
  contextMenuModule,
  controlsModule,
  dockModule,
  loadingModule,
  mediaModule,
  modalModule,
]);

export const registryDefinitions = createModuleRegistryDefinitions(
  builtInModules as any,
);

export const registryOperations = createRegistryOperations(registryDefinitions);

export function createRegistryStore(initialEntries: any[] = []) {
  return createStoreWith(initialEntries, registryDefinitions);
}
