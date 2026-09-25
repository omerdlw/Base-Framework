import { REGISTRY_TYPES, type AppRegistryEntry } from "@/core/orchestration";
import { DEFAULT_ACCOUNT_ICON } from "@/features/account/constants";

export const APP_REGISTRY_ENTRIES: readonly AppRegistryEntry[] = Object.freeze([
  {
    type: REGISTRY_TYPES.DOCK,
    items: {
      "/": {
        description: "Template overview",
        icon: "solar:home-2-bold",
        path: "/",
        title: "Home",
      },
      "/account": {
        description: "Manage your account",
        icon: DEFAULT_ACCOUNT_ICON,
        path: "/account",
        title: "Account",
      },
    },
  },
]);
