export interface AuthRoutes {
  CALLBACK: string;
  SIGN_IN: string;
}

export type OAuthProvider = "google" | "github" | "x" | string;

export interface AuthUser {
  aal: string;
  claims: Record<string, any>;
  email: string | null;
  id: string;
  sessionId: string | null;
}

export interface AuthState {
  error: any;
  isAuthenticated: boolean;
  isConfigured: boolean;
  isReady: boolean;
  session: any | null;
  user: any | null;
}

export interface AuthContextValue extends AuthState {
  client: any | null;
  refresh: () => Promise<AuthState | null>;
  signOut: (scope?: "local" | "global" | "others") => Promise<void>;
}

export interface RequestEmailAuthParams {
  captchaToken?: string | null;
  createUser?: boolean;
  email: string;
  emailRedirectTo?: string;
  metadata?: Record<string, any>;
}

export interface VerifyEmailOtpParams {
  email: string;
  token: string | number;
  type?:
    | "email"
    | "signup"
    | "invite"
    | "magiclink"
    | "recovery"
    | "email_change"
    | string;
}

export interface SignInWithOAuthParams {
  provider: OAuthProvider;
  redirectTo?: string;
}

export interface LinkIdentityParams {
  provider: OAuthProvider;
  redirectTo?: string;
}

export interface PasskeyRenameParams {
  friendlyName: string;
  passkeyId: string;
}

export interface PasskeyDeleteParams {
  passkeyId: string;
}

export interface RequireAuthOptions {
  enabled?: boolean;
  openSignIn?: boolean;
  redirectTo?: string;
}

export interface RequireAuthResult {
  isAuthenticated: boolean;
  isReady: boolean;
  user: any | null;
}

export interface RequireUserOptions {
  redirectTo?: string | null;
}
