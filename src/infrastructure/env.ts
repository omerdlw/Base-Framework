import { trimToNull } from "@/core/utils";

export interface SupabasePublicConfig {
  publishableKey: string;
  url: string;
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = trimToNull(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = trimToNull(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  if (!url || !publishableKey) return null;
  return { publishableKey, url };
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabasePublicConfig());
}

export function requireSupabasePublicConfig(): SupabasePublicConfig {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local and set the public URL and publishable key",
    );
  }
  return config;
}

export function requireSupabaseSecretKey(): string {
  const secretKey = trimToNull(process.env.SUPABASE_SECRET_KEY);
  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY is required on the server");
  }
  return secretKey;
}
