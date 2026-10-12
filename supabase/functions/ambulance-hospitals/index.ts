import { withSupabase } from "npm:@supabase/server@1";
import { normalizeHospital, hospitalFields, isHospital } from "./places.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const point = (lat: unknown, lng: unknown) => typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
async function google(path: string, key: string, body?: unknown) {
  const response = await fetch(`https://places.googleapis.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": body ? hospitalFields.split(",").map(field => `places.${field}`).join(",") : hospitalFields },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Google hospital lookup is unavailable. Try again or choose a registered hospital.");
  return response.json();
}
export default {
  fetch: withSupabase({ auth: "user" }, async (request, ctx) => {
    if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
    const body = await request.json().catch(() => null);
    if (!body || !["search", "book"].includes(body.action)) return Response.json({ error: "Invalid request" }, { status: 400 });
    const key = Deno.env.get("GOOGLE_PLACES_SERVER_KEY");
    if (!key) return body.action === "search"
      ? Response.json({ configured: false, places: [] }, { headers: { "cache-control": "no-store" } })
      : Response.json({ error: "Google hospital booking is not configured yet" }, { status: 503 });
    const booking = body.action === "book";
    const lat = booking ? body.pickupLatitude : body.latitude;
    const lng = booking ? body.pickupLongitude : body.longitude;
    if (!point(lat, lng) || (!booking && (typeof body.query !== "string" || body.query.length > 160)) ||
      (booking && (!uuid.test(body.patientId ?? "") || !uuid.test(body.idempotencyKey ?? "") ||
        typeof body.pickupAddress !== "string" || body.pickupAddress.trim().length < 5 || body.pickupAddress.length > 500 ||
        !["BLS", "ALS", "NICU"].includes(body.capabilityCode) || typeof body.destinationPlaceId !== "string" ||
        !/^[A-Za-z0-9_-]{1,300}$/.test(body.destinationPlaceId)))) return Response.json({ error: "Invalid hospital request" }, { status: 400 });
    const { data: allowed, error: authError } = await ctx.supabase.rpc("authorize_ambulance_hospital_lookup");
    if (authError || !allowed) return Response.json({ error: authError ? "Patient account required" : "Too many searches. Please wait a minute." }, { status: authError ? 403 : 429 });
    try {
      if (!booking) {
        const query = body.query.trim();
        const response = await google(query ? "places:searchText" : "places:searchNearby", key, query ? {
          textQuery: `${query} hospital clinic`, pageSize: 20,
          locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 10000 } },
        } : {
          includedTypes: ["hospital", "doctor"], maxResultCount: 20, rankPreference: "DISTANCE",
          locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: 10000 } },
        });
        const places = (response.places ?? []).filter(isHospital).map((place: unknown) => normalizeHospital(place, { latitude: lat, longitude: lng })).filter(Boolean);
        return Response.json({ configured: true, places }, { headers: { "cache-control": "no-store" } });
      }
      // Resolve the place again on the server: never trust client names, coordinates or facility IDs.
      const place = await google(`places/${encodeURIComponent(body.destinationPlaceId)}`, key);
      const hospital = isHospital(place) ? normalizeHospital(place, { latitude: lat, longitude: lng }) : null;
      if (!hospital || hospital.place_id !== body.destinationPlaceId) return Response.json({ error: "Destination hospital is unavailable. Search again." }, { status: 400 });
      const { data: bookingId, error } = await ctx.supabaseAdmin.rpc("request_google_ambulance_booking", {
        p_auth_user_id: ctx.userClaims?.id, p_patient_id: body.patientId,
        p_pickup_latitude: lat, p_pickup_longitude: lng, p_pickup_address: body.pickupAddress.trim(),
        p_destination_place_id: hospital.place_id, p_destination_name: hospital.name, p_destination_address: hospital.address,
        p_destination_latitude: hospital.latitude, p_destination_longitude: hospital.longitude,
        p_capability_code: body.capabilityCode, p_idempotency_key: body.idempotencyKey,
      });
      if (error) return Response.json({ error: "Could not book transport. Check your pickup and any existing active request." }, { status: 409 });
      return Response.json({ bookingId }, { headers: { "cache-control": "no-store" } });
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "Hospital service unavailable" }, { status: 502 });
    }
  }),
};
