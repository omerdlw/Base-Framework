"use client";

import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import type { SurfaceEntry } from "@/core/modules/nav";
import {
  AUTH_INPUT_CLASS,
  OAuthProviderButton,
  OAuthProviderGridButton,
  OAuthProviderList,
  type SignInData,
  type SignInSurfaceProps,
  type EmailSignInSurfaceProps,
  type OAuthProviderButtonProps,
  type OAuthProviderListProps,
} from "./sign-in-surface-view";

export {
  AUTH_INPUT_CLASS,
  OAuthProviderButton,
  OAuthProviderGridButton,
  OAuthProviderList,
};

export type {
  SignInData,
  SignInSurfaceProps,
  EmailSignInSurfaceProps,
  OAuthProviderButtonProps,
  OAuthProviderListProps,
};

const DEFAULT_SURFACE_WIDTH = 320;

export const SignInSurface = dynamic<SignInSurfaceProps>(
  () => import("./sign-in-surface-view").then((m) => m.SignInSurface),
  { ssr: false },
);

export const EmailSignInSurface = dynamic<EmailSignInSurfaceProps>(
  () => import("./sign-in-surface-view").then((m) => m.EmailSignInSurface),
  { ssr: false },
);

function createSurfaceEntry(
  Component: ComponentType<any>,
  title: string,
  data: SignInData = {},
  config: Partial<SurfaceEntry> = {},
): SurfaceEntry {
  return {
    component: Component,
    title,
    props: { data },
    width: DEFAULT_SURFACE_WIDTH,
    ...config,
  };
}

export const createSignInSurfaceEntry = (
  data: SignInData = {},
  config: Partial<SurfaceEntry> = {},
) => createSurfaceEntry(SignInSurface, "Sign In", data, config);

export const createEmailSignInSurfaceEntry = (
  data: SignInData = {},
  config: Partial<SurfaceEntry> = {},
) => createSurfaceEntry(EmailSignInSurface, "Sign In", data, config);
