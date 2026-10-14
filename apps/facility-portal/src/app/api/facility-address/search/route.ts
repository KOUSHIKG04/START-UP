import { createClient } from "@/lib/supabase/server";

type SearchResult = {
  formatted_address?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
};

export async function POST(request: Request) {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return Response.json({ error: "Sign in to search addresses." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Enter an address to search." }, { status: 400 });
  }
  const query = typeof body === "object" && body !== null && "query" in body ? body.query : null;
  if (typeof query !== "string" || query.trim().length < 2 || query.trim().length > 200) {
    return Response.json({ error: "Enter at least two characters to search." }, { status: 400 });
  }

  const key = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!key) return Response.json({ error: "Address search is not configured. Move the map to place the pin." }, { status: 503 });

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query.trim());
  url.searchParams.set("key", key);
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("Address search unavailable");
    const result = await response.json() as { status?: string; results?: SearchResult[] };
    if (result.status !== "OK" && result.status !== "ZERO_RESULTS") throw new Error("Address search unavailable");
    const places = (result.results ?? []).flatMap(item => {
      const lat = item.geometry?.location?.lat;
      const lng = item.geometry?.location?.lng;
      return item.formatted_address && typeof lat === "number" && typeof lng === "number"
        ? [{ address: item.formatted_address, latitude: lat, longitude: lng }]
        : [];
    }).slice(0, 5);
    return Response.json({ places });
  } catch {
    return Response.json({ error: "Could not search addresses. Move the map or try again." }, { status: 502 });
  }
}
