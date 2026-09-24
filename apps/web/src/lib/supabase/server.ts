import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@startup/data-access";
import { getSupabaseConfig } from "./config";

export async function createClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase web configuration is missing");
  const cookieStore = await cookies();

  return createServerClient<Database>(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(items) {
        try {
          items.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Components cannot write cookies. The proxy refreshes them.
        }
      },
    },
  });
}
