"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@startup/data-access";
import { getSupabaseConfig } from "./config";

export function createBrowserSupabaseClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Portal connection is not configured");
  return createBrowserClient<Database>(config.url, config.key);
}
