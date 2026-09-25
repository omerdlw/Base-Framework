import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabasePublicConfig } from "@/infrastructure/env";
import type { Database } from "./database.types";

export type { Database };

let browserClient: SupabaseClient<Database> | null = null;

export function createBrowserSupabaseClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;

  const { publishableKey, url } = requireSupabasePublicConfig();
  browserClient = createBrowserClient<Database>(url, publishableKey, {
    auth: {
      experimental: { passkey: true },
      flowType: "pkce",
    },
  });

  return browserClient;
}
