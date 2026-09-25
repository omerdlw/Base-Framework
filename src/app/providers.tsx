"use client";

import type { JSX, ReactNode } from "react";
import { Compose } from "@/core/composer";
import { CoreProvider } from "@/core/provider";
import type { AppRegistryEntry } from "@/core/orchestration";
import { AuthProvider, AuthListener } from "@/features/auth";
import {
  AccountProvider,
  AccountGuard,
  AccountDockActions,
  SocialRealtimeSync,
} from "@/features/account";
import { APP_REGISTRY_ENTRIES } from "./registry";

export interface ProvidersProps {
  children: ReactNode;
  registryEntries?: readonly AppRegistryEntry[] | AppRegistryEntry[];
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
        [CoreProvider, { registryEntries }],
      ]}
    >
      <AuthListener />
      <AccountGuard />
      <AccountDockActions />
      <SocialRealtimeSync />
      {children}
    </Compose>
  );
}
