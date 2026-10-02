import { toUserMessage } from "@omerdlw/base-framework/utils";

const AUTH_ERROR_CODES: Readonly<Record<string, string>> = Object.freeze({
  otp_expired: "That code has expired or isn't valid. Request a new one",
  otp_disabled: "Email sign-in isn't available right now",
  email_address_invalid: "Enter a valid email address",
  email_address_not_authorized: "We can't send email to that address",
  validation_failed: "Check your details and try again",
  over_email_send_rate_limit:
    "Too many emails sent. Please wait a few minutes and try again",
  over_request_rate_limit:
    "Too many attempts. Please wait a moment and try again",
  over_sms_send_rate_limit:
    "Too many attempts. Please wait a moment and try again",
  signup_disabled: "New sign-ups are paused right now",
  user_banned: "This account has been suspended",
  email_exists: "That email is already linked to another account",
  user_already_exists: "That email is already linked to another account",
  identity_already_exists: "That account is already linked to another profile",
  single_identity_not_deletable:
    "Keep at least one sign-in method connected to this account",
  manual_linking_disabled: "Connecting accounts isn't available right now",
  provider_disabled: "That sign-in method isn't available right now",
  session_expired: "Your session has expired. Please sign in again",
  session_not_found: "Your session has expired. Please sign in again",
  reauthentication_needed:
    "For your security, please sign in again to continue",
  reauthentication_not_valid: "That code isn't valid. Request a new one",
  flow_state_expired: "That sign-in link has expired. Please try again",
  flow_state_not_found: "That sign-in link has expired. Please try again",
});

const WEBAUTHN_ERRORS: Readonly<Record<string, string>> = Object.freeze({
  NotAllowedError: "Passkey request was cancelled or timed out",
  AbortError: "Passkey request was cancelled",
  InvalidStateError: "This device already has a passkey for your account",
  NotSupportedError: "This device or browser doesn't support passkeys",
  SecurityError: "Passkeys can't be used on this site",
});

export function getAuthErrorMessage(error: unknown, fallback?: string): string {
  const name = (error as { name?: string } | null)?.name;
  if (name && WEBAUTHN_ERRORS[name]) return WEBAUTHN_ERRORS[name];
  return toUserMessage(error, { codes: AUTH_ERROR_CODES, fallback });
}
