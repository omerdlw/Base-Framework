"use client";

import type { JSX, ReactNode } from "react";
import { Compose } from "@/core/kernel";
import { defaultModules } from "@/modules";
import { ThemeProvider } from "@/core/theme";
import { CoreProvider } from "@/core/provider";
import type { AppRegistryEntry } from "@/core/kernel";
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
