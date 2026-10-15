import { withSupabase } from "npm:@supabase/server@1";
import { normalizeAddress } from "./address.ts";
class LookupFailure extends Error {}

export default {
  fetch: withSupabase({ auth: "user" }, async (request, ctx) => {
    if (request.method !== "POST")
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    const body = await request.json().catch(() => null);
    if (
      !body ||
      typeof body.latitude !== "number" ||
      typeof body.longitude !== "number" ||
      !Number.isFinite(body.latitude) ||
      !Number.isFinite(body.longitude) ||
      Math.abs(body.latitude) > 90 ||
      Math.abs(body.longitude) > 180
    ) {
      return Response.json(
        { error: "Choose a valid point on the map" },
        { status: 400 }
      );
    }
    const key = Deno.env.get("GOOGLE_GEOCODING_SERVER_KEY");
    if (!key)
      return Response.json(
        { configured: false, address: null },
        { headers: { "cache-control": "no-store" } }
      );
    const { data: allowed, error } = await ctx.supabase.rpc(
      "authorize_map_place_lookup"
    );
    if (error || !allowed)
      return Response.json(
        {
          error: error
            ? "Sign in to look up an address"
            : "Too many address lookups. Wait a minute and retry.",
        },
        { status: error ? 403 : 429 }
      );
    try {
      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      url.searchParams.set("latlng", `${body.latitude},${body.longitude}`);
      url.searchParams.set("language", "en");
      url.searchParams.set("key", key);
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok)
        throw new LookupFailure("Google address lookup failed. Retry shortly.");
      const result = await response.json();
      if (result.status === "REQUEST_DENIED")
        throw new LookupFailure(
          "Server geocoding is not authorized. Check Geocoding API, billing and the server key restrictions."
        );
      if (
        result.status === "OVER_QUERY_LIMIT" ||
        result.status === "OVER_DAILY_LIMIT"
      )
        throw new LookupFailure(
          "Google address lookup quota is unavailable. Try again later."
        );
      if (result.status !== "OK" && result.status !== "ZERO_RESULTS")
        throw new LookupFailure(
          "Google address service could not resolve this point. Try again."
        );
      return Response.json(
        { configured: true, address: normalizeAddress(result.results?.[0]) },
        { headers: { "cache-control": "no-store" } }
      );
    } catch (cause) {
      // Fetch errors may contain the request URL, including the server key.
      return Response.json(
        {
          error:
            cause instanceof LookupFailure
              ? cause.message
              : "Google address lookup could not connect or timed out. Retry.",
        },
        { status: 502 }
      );
    }
  }),
};
