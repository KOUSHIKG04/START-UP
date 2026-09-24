export function validateDatabaseUrl(value: string, requireTls = true): URL {

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("Database connection URL is invalid");
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Database URL must use PostgreSQL");

  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);

  if (
    requireTls &&
    !local &&
    !["verify-full", "verify-ca"].includes(
      url.searchParams.get("sslmode") ?? ""
    )
  ) {
    throw new Error(
      "Remote database URL requires sslmode=verify-full (or verify-ca)"
    );
  }
  
  return url;
}
