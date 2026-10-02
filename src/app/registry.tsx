import type { AppRegistryEntry } from "@omerdlw/base-framework/kernel";
import { project } from "@config/project";
import { DEFAULT_ACCOUNT_ICON } from "@/features/account/constants";

export const APP_REGISTRY_ENTRIES: readonly AppRegistryEntry[] = Object.freeze([
  {
    type: "dock",
    items: {
      "/": {
        description: project.description,
        icon: "solar:home-2-bold",
        name: "home",
        title: "Home",
        path: "/",
      },
      "/account": {
        description: "Manage your account",
        icon: DEFAULT_ACCOUNT_ICON,
        name: "account",
        title: "Account",
        path: "/account",
      },
    },
  },
]);
