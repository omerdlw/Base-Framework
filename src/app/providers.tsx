"use client";

import type { JSX, ReactNode } from "react";
import { CoreProvider } from "@/core/provider";
import type { AppRegistryEntry } from "@/core/orchestration";
import { AuthProvider, AuthListener } from "@/features/auth";
import {
  AccountProvider,
  AccountGuard,
  AccountNavActions,
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
    <CoreProvider registryEntries={registryEntries}>
      <AuthProvider>
        <AccountProvider>
          <AuthListener />
          <AccountGuard />
          <AccountNavActions />
          <SocialRealtimeSync />
          {children}
        </AccountProvider>
      </AuthProvider>
    </CoreProvider>
  );
}
