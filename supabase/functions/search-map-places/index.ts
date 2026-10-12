import { withSupabase } from "npm:@supabase/server@1";
import { normalizeMapPlace } from "./places.ts";
export default {
  fetch: withSupabase({ auth: "user" }, async (request, ctx) => {
    if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
    const body = await request.json().catch(() => null);
    if (!body || typeof body.query !== "string" || body.query.trim().length < 2 || body.query.length > 160 ||
      (body.latitude === undefined) !== (body.longitude === undefined) ||
      (body.latitude !== undefined && (typeof body.latitude !== "number" || typeof body.longitude !== "number" || !Number.isFinite(body.latitude) || !Number.isFinite(body.longitude) || Math.abs(body.latitude)>90 || Math.abs(body.longitude)>180))) {
      return Response.json({ error: "Enter an area or complete address" }, { status: 400 });
    }
    const key = Deno.env.get("GOOGLE_PLACES_SERVER_KEY");
    if (!key) return Response.json({ configured: false, places: [] }, { headers: { "cache-control": "no-store" } });
    const { data: allowed, error } = await ctx.supabase.rpc("authorize_map_place_lookup");
    if (error || !allowed) return Response.json({ error: error ? "Sign in to search places" : "Too many searches. Wait a minute and retry." }, { status: error ? 403 : 429 });
    try {
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents,places.attributions" },
        body: JSON.stringify({ textQuery: body.query.trim(), pageSize: 5,
          ...(body.latitude !== undefined ? { locationBias: { circle: { center: { latitude: body.latitude, longitude: body.longitude }, radius: 10000 } } } : {}),
        }), signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return Response.json({ error: "Place search failed. Check the Places API configuration or try again." }, { status: 502 });
      const result = await response.json();
      return Response.json({ configured: true, places: (result.places ?? []).map(normalizeMapPlace).filter(Boolean) }, { headers: { "cache-control": "no-store" } });
    } catch {
      return Response.json({ error: "Place search timed out. Try again." }, { status: 502 });
    }
  }),
};
