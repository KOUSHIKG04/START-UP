export function reviewErrorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof Error) return cause.message;
  // Supabase RPC errors are plain objects, not always Error instances.
  if (
    typeof cause === "object" &&
    cause !== null &&
    "message" in cause &&
    typeof cause.message === "string" &&
    cause.message.trim()
  ) {
    return cause.message;
  }
  return fallback;
}
