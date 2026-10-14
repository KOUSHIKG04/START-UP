/** React Native's fetch Response may come from a different constructor. */
export async function mapFunctionError(error: unknown, feature: string) {
  const context = (error as { context?: { status?: number; clone?: () => { json: () => Promise<unknown> }; json?: () => Promise<unknown> } } | null)?.context;
  type ErrorDetails = { error?: unknown; message?: unknown };
  let details: ErrorDetails | null = null;
  try {
    const response = context?.clone?.() ?? context;
    if (response?.json) details = await response.json() as ErrorDetails | null;
  } catch { /* A gateway error can also be plain text. */ }
  const status = context?.status;
  if (status === 401) return `${feature} rejected your sign-in (HTTP 401). Sign out and sign in again. If it persists, the server JWT configuration needs checking.`;
  if (typeof details?.error === "string") return details.error;
  if (status === 404) return `${feature} endpoint was not found (HTTP 404). Check the Supabase project and deployment.`;
  if (status === 503) return `${feature} server is temporarily unavailable (HTTP 503). Retry shortly.`;
  if (typeof details?.message === "string") return `${feature}: ${details.message}${status ? ` (HTTP ${status})` : ""}`;
  return status ? `${feature} failed (HTTP ${status}). Retry shortly.` : `Could not connect to ${feature.toLowerCase()}. Check your internet connection and retry.`;
}
