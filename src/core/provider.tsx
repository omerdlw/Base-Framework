"use client";

import dynamic from "next/dynamic";
import type { JSX, ReactNode } from "react";

const DynamicModal = dynamic(
  () => import("./modules/modal").then((m) => m.Modal),
  { ssr: false },
);
import {
  AmbientProvider,
  BackgroundOverlay,
  BackgroundProvider,
  ContextMenuGlobal,
  ContextMenuProvider,
  Controls,
  GlobalError,
  GlobalErrorListener,
  LoadingOverlay,
  LoadingProvider,
  ModalProvider,
  Nav,
  NavigationProvider,
  NotificationContainer,
  NotificationListener,
  NotificationProvider,
  useNavigation,
} from "./modules";
import {
  PageControllerProvider,
  RegistryProvider,
  type AppRegistryEntry,
} from "@/core/orchestration";

function RegisteredNavigation(): JSX.Element | null {
  const { navigationItems } = useNavigation();
  if (!navigationItems?.length) return null;

  return (
    <>
      <Nav />
      <Controls />
    </>
  );
}

export interface CoreProviderProps {
  children: ReactNode;
  registryEntries?: readonly AppRegistryEntry[] | AppRegistryEntry[];
}

export function CoreProvider({
  children,
  registryEntries = [],
}: CoreProviderProps): JSX.Element {
  return (
    <GlobalError>
      <RegistryProvider initialEntries={registryEntries}>
        <NotificationProvider>
          <AmbientProvider>
            <BackgroundProvider>
              <LoadingProvider>
                <ModalProvider modalRenderer={DynamicModal}>
                  <ContextMenuProvider>
                    <NavigationProvider>
                      <PageControllerProvider>
                        <BackgroundOverlay />
                        {children}
                        <RegisteredNavigation />
                        <ContextMenuGlobal />
                        <LoadingOverlay />
                        <NotificationListener />
                        <NotificationContainer />
                        <GlobalErrorListener />
                      </PageControllerProvider>
                    </NavigationProvider>
                  </ContextMenuProvider>
                </ModalProvider>
              </LoadingProvider>
            </BackgroundProvider>
          </AmbientProvider>
        </NotificationProvider>
      </RegistryProvider>
    </GlobalError>
  );
}
