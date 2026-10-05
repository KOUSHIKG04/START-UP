import { createClient } from "@/lib/supabase/server";

type GeocodingResponse = {
  status?: string;
  results?: Array<{
    formatted_address?: string;
    address_components?: Array<{ long_name: string; types: string[] }>;
  }>;
};

export async function POST(request: Request) {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return Response.json({ error: "Sign in to use location." }, { status: 401 });

  let coordinates: unknown;
  try {
    coordinates = await request.json();
  } catch {
    return Response.json({ error: "Invalid location." }, { status: 400 });
  }

  if (!coordinates || typeof coordinates !== "object") {
    return Response.json({ error: "Invalid location." }, { status: 400 });
  }
  const { latitude, longitude } = coordinates as { latitude?: unknown; longitude?: unknown };
  if (typeof latitude !== "number" || !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
      typeof longitude !== "number" || !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
    return Response.json({ error: "Invalid location." }, { status: 400 });
  }

  const key = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!key) return Response.json({ error: "Automatic address lookup is not configured. Enter the address manually." }, { status: 503 });

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${latitude},${longitude}`);
  url.searchParams.set("key", key);
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("Geocoding service unavailable");
    const result = await response.json() as GeocodingResponse;
    const match = result.status === "OK" ? result.results?.[0] : undefined;
    if (!match?.formatted_address) throw new Error("No address found for this location");
    const component = (...types: string[]) => match.address_components?.find(item => types.some(type => item.types.includes(type)))?.long_name ?? "";
    const street = [component("premise"), component("street_number"), component("route")].filter(Boolean).join(" ");
    return Response.json({
      address: street || match.formatted_address.split(",")[0]?.trim() || "",
      locality: component("sublocality_level_1", "sublocality", "neighborhood"),
      city: component("locality", "administrative_area_level_3", "administrative_area_level_2"),
      state: component("administrative_area_level_1"),
      pincode: component("postal_code"),
    });
  } catch {
    return Response.json({ error: "Could not find an address for this location. Enter it manually." }, { status: 502 });
  }
}
