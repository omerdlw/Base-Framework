import { normalizeEmail, unwrapResult } from "./utils";
import type {
  LinkIdentityParams,
  PasskeyDeleteParams,
  PasskeyRenameParams,
  RequestEmailAuthParams,
  SignInWithOAuthParams,
  VerifyEmailOtpParams,
} from "./types";

export async function requestEmailAuth(
  client: any,
  {
    captchaToken,
    createUser = false,
    email,
    emailRedirectTo,
    metadata = {},
  }: RequestEmailAuthParams,
): Promise<{ email: string; sent: true }> {
  const normalizedEmail = normalizeEmail(email);
  const hasMetadata = metadata && Object.keys(metadata).length > 0;

  const { error } = await client.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      captchaToken: captchaToken || undefined,
      emailRedirectTo,
      shouldCreateUser: createUser,
      ...(hasMetadata && { data: metadata }),
    },
  });

  if (error) throw error;

  return {
    email: normalizedEmail,
    sent: true,
  };
}

export async function verifyEmailOtp(
  client: any,
  { email, token, type = "email" }: VerifyEmailOtpParams,
): Promise<any> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedToken = String(token);

  const primaryResult = await client.auth.verifyOtp({
    email: normalizedEmail,
    token: normalizedToken,
    type,
  });

  if (!primaryResult.error) {
    return unwrapResult(primaryResult, "OTP verification failed");
  }

  const fallbackType = type === "signup" ? "email" : "signup";
  const fallbackResult = await client.auth.verifyOtp({
    email: normalizedEmail,
    token: normalizedToken,
    type: fallbackType,
  });

  return unwrapResult(
    fallbackResult.error ? primaryResult : fallbackResult,
    "OTP verification failed",
  );
}

export async function signInWithOAuth(
  client: any,
  { provider, redirectTo }: SignInWithOAuthParams,
): Promise<any> {
  return unwrapResult(
    await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    }),
    "OAuth sign-in could not be started",
  );
}

export async function linkIdentity(
  client: any,
  { provider, redirectTo }: LinkIdentityParams,
): Promise<any> {
  const targetProvider = provider === "x" ? "twitter" : provider;

  const { data, error } = await client.auth.linkIdentity({
    provider: targetProvider,
    options: { redirectTo },
  });

  if (error) throw error;

  if (data?.url && typeof window !== "undefined") {
    window.location.assign(data.url);
  }

  return data;
}

export async function unlinkIdentity(client: any, identity: any): Promise<any> {
  const { data, error } = await client.auth.unlinkIdentity(identity);
  if (error) throw error;
  return data;
}

export async function getUserIdentities(client: any): Promise<any[]> {
  const { data, error } = await client.auth.getUserIdentities();
  if (error) throw error;
  return Array.isArray(data?.identities) ? data.identities : [];
}

export async function signInWithPasskey(client: any): Promise<any> {
  return unwrapResult(
    await client.auth.signInWithPasskey(),
    "Passkey sign-in failed",
  );
}

export async function registerPasskey(client: any): Promise<any> {
  return unwrapResult(
    await client.auth.registerPasskey(),
    "Passkey registration failed",
  );
}

export async function listPasskeys(client: any): Promise<any[]> {
  const data = unwrapResult<{ passkeys?: any[] } | any[]>(
    await client.auth.passkey.list(),
    "Passkeys could not be loaded",
  );
  return Array.isArray(data)
    ? data
    : (data as { passkeys?: any[] })?.passkeys || [];
}

export async function renamePasskey(
  client: any,
  { friendlyName, passkeyId }: PasskeyRenameParams,
): Promise<any> {
  return unwrapResult(
    await client.auth.passkey.update({ friendlyName, passkeyId }),
    "Passkey could not be renamed",
  );
}

export async function deletePasskey(
  client: any,
  { passkeyId }: PasskeyDeleteParams,
): Promise<{ deleted: true }> {
  const { error } = await client.auth.passkey.delete({ passkeyId });
  if (error) throw error;
  return { deleted: true };
}

export async function requestReauthentication(
  client: any,
): Promise<{ sent: true }> {
  const { error } = await client.auth.reauthenticate();
  if (error) throw error;
  return { sent: true };
}

export async function verifyReauthentication(
  client: any,
  token: string | number,
): Promise<any> {
  return unwrapResult(
    await client.auth.verifyOtp({
      token: String(token),
      type: "reauthentication",
    }),
    "Reauthentication failed",
  );
}

export async function signOut(
  client: any,
  scope: "local" | "global" | "others" = "local",
): Promise<void> {
  const { error } = await client.auth.signOut({ scope });
  if (error) throw error;
}

export async function recordClientAuthEvent(
  event: string,
  metadata: Record<string, any> = {},
): Promise<void> {
  const response = await fetch("/api/auth/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event, metadata }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || "Security event could not be recorded");
  }
}
