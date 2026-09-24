import { defineConfig } from "drizzle-kit";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

// Drizzle Kit runs in Node; unlike Bun it does not load .env automatically.
if (existsSync(".env")) loadEnvFile(".env");

// Generation is offline. Only Supabase CLI applies SQL migrations.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "../../supabase/migrations",
  migrations: {
    prefix: "supabase",
  },
  schemaFilter: ["clinzo"],
  ...(process.env.MIGRATION_DATABASE_URL
    ? { dbCredentials: { url: process.env.MIGRATION_DATABASE_URL } }
    : {}),
  strict: true,
  verbose: true,
});
