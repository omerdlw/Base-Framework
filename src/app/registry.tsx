import dynamic from "next/dynamic";
import { REGISTRY_TYPES, type AppRegistryEntry } from "@/core/orchestration";
import { DEFAULT_ACCOUNT_ICON } from "@/features/account/constants";

const NotificationsModal = dynamic(
  () =>
    import("@/features/account/social/components/modals/notifications-modal"),
  { ssr: false },
);

export const APP_REGISTRY_ENTRIES: readonly AppRegistryEntry[] = Object.freeze([
  {
    type: REGISTRY_TYPES.NAV,
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
  {
    type: REGISTRY_TYPES.MODAL,
    items: {
      NOTIFICATIONS_MODAL: NotificationsModal,
    },
  },
]);
