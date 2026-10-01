"use client";

export type * from "./types";

export {
  deletePasskey,
  getUserIdentities,
  linkIdentity,
  listPasskeys,
  registerPasskey,
  renamePasskey,
  requestEmailAuth,
  signInWithOAuth,
  signInWithPasskey,
  unlinkIdentity,
  verifyEmailOtp,
} from "./client";

export { AUTH_EVENTS, OAUTH_PROVIDERS } from "./constants";

export { getAuthCallbackUrl, sanitizeNextPath } from "./utils";
export { getAuthErrorMessage } from "./messages";

export { AuthProvider, useAuth } from "./provider";

export {
  createSignInSurfaceEntry,
  AUTH_INPUT_CLASS,
} from "./components/sign-in-surface";
export { createVerificationSurfaceEntry } from "./components/verification-surface";
export { AuthListener } from "./components/auth-listener";
