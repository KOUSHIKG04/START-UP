import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { validateDatabaseUrl } from "./config";

export function createDatabase(url: string) {
  validateDatabaseUrl(url);
  // Compatible with Supabase's transaction pooler; no prepared statement cache.
  const client = postgres(url, {
    prepare: false,
    max: 5,
    connect_timeout: 5,
    idle_timeout: 20,
    connection: { application_name: "clinzo-tooling", statement_timeout: 5000 },
  });
  return {
    db: drizzle(client, { schema }),
    client,
    close: () => client.end({ timeout: 5 }),
  };
}
export type Database = ReturnType<typeof createDatabase>["db"];
