"use client";

export type * from "./types";

export {
  deletePasskey,
  getUserIdentities,
  linkIdentity,
  listPasskeys,
  recordClientAuthEvent,
  registerPasskey,
  renamePasskey,
  requestEmailAuth,
  requestReauthentication,
  signInWithOAuth,
  signInWithPasskey,
  signOut,
  unlinkIdentity,
  verifyEmailOtp,
  verifyReauthentication,
} from "./client";

export {
  AUTH_EVENTS,
  AUTH_ROUTES,
  DEFAULT_MAX_AUTH_AGE_SECONDS,
  INITIAL_AUTH_STATE,
  OAUTH_PROVIDERS,
  resolvePageAuth,
  type AuthEventType,
  type AuthPageConfig,
} from "./constants";

export {
  getAuthCallbackUrl,
  normalizeEmail,
  sanitizeNextPath,
  toAuthUser,
  unwrapResult,
} from "./utils";

export {
  AuthProvider,
  useAuth,
  useRequireAuth,
  useSession,
  useUser,
} from "./provider";

export {
  SignInSurface,
  createSignInSurfaceEntry,
  EmailSignInSurface,
  createEmailSignInSurfaceEntry,
  OAuthProviderButton,
  OAuthProviderList,
  AUTH_INPUT_CLASS,
} from "./components/sign-in-surface";
export type {
  SignInData,
  SignInSurfaceProps,
  EmailSignInSurfaceProps,
  OAuthProviderButtonProps,
  OAuthProviderListProps,
} from "./components/sign-in-surface";

export {
  VerificationSurface,
  createVerificationSurfaceEntry,
} from "./components/verification-surface";
export type {
  VerificationData,
  VerificationSurfaceProps,
} from "./components/verification-surface";

export {
  AuthListener,
  AuthRequiredListener,
  AuthEventBridge,
} from "./components/auth-listener";
