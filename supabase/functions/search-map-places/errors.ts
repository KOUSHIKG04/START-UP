export function placeSearchError(status: number, reason?: string) {

  if (reason === "SERVICE_DISABLED")
    return "Enable Places API (New) in the Google Cloud project used by the server key.";

  if (reason === "BILLING_DISABLED")
    return "Enable billing for the Google Cloud project used by place search.";

  if (reason === "API_KEY_INVALID")
    return "The Places server key is invalid. Update GOOGLE_PLACES_SERVER_KEY in Supabase.";

  if (reason === "API_KEY_SERVICE_BLOCKED")
    return "Allow Places API (New) in the server key’s API restrictions.";

  if (reason?.startsWith("API_KEY_") && reason.endsWith("_BLOCKED"))
    return "The Places server key’s application restrictions block Supabase. Use a server key, not an Android Maps key.";

  if (status === 429)
    return "Google place-search quota is exceeded. Retry later.";
  
  if (status === 403)
    return "Google denied place search. Check Places API (New), billing and server key restrictions.";

  return "Google place search is temporarily unavailable. Retry shortly.";
}
