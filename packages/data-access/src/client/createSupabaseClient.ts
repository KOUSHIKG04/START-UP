import {
  createClient,
  type SupabaseClientOptions,
} from "@supabase/supabase-js";
import type { Database } from "../generated/database.types";

// Apps supply public configuration and platform-specific session storage. // Never pass database URLs or service-role/secret keys to client applications.
export function createSupabaseClient(
  url: string,
  publishableKey: string,
  options?: SupabaseClientOptions<"public">
) {
  if (!url || !publishableKey) {
    throw new Error("Supabase URL and publishable key are required");
  }
  return createClient<Database>(url, publishableKey, options);
}
export type AppSupabaseClient = ReturnType<typeof createSupabaseClient>;
