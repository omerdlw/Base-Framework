"use client";

import type { JSX, ReactNode } from "react";
import { Compose } from "@omerdlw/base-framework/kernel";
import { defaultModules } from "@omerdlw/base-framework/modules";
import { ThemeProvider } from "@omerdlw/base-framework/theme";
import { CoreProvider } from "@omerdlw/base-framework/provider";
import type { AppRegistryEntry } from "@omerdlw/base-framework/kernel";
import { AuthProvider, AuthListener } from "@/features/auth";
import {
  AccountProvider,
  AccountGuard,
  SocialRealtimeSync,
} from "@/features/account";
import { themes } from "@config";
import { APP_REGISTRY_ENTRIES } from "./registry";

export interface ProvidersProps {
  children: ReactNode;
  registryEntries?: readonly AppRegistryEntry[];
}

export function Providers({
  children,
  registryEntries = APP_REGISTRY_ENTRIES,
}: ProvidersProps): JSX.Element {
  return (
    <Compose
      providers={[
        AuthProvider,
        AccountProvider,
        [ThemeProvider, { themes }],
        [CoreProvider, { modules: defaultModules, registryEntries }],
      ]}
    >
      <AuthListener />
      <AccountGuard />
      <SocialRealtimeSync />
      {children}
    </Compose>
  );
}
