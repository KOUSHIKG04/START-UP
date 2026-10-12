import { mapSearchInputSchema, mapSearchResultSchema } from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";
export async function searchMapPlaces(client: AppSupabaseClient, input: { query: string; latitude?: number; longitude?: number }) {
  const { data, error } = await client.functions.invoke("search-map-places", { body: mapSearchInputSchema.parse(input) });
  if (error) {
    const response = "context" in error ? error.context : undefined;
    if (response instanceof Response) {
      const details = await response.clone().json().catch(() => null) as { error?: string } | null;
      if (details?.error) throw new Error(details.error);
    }
    throw new Error("Place search is unavailable. Try again or choose a point on the map.");
  }
  return mapSearchResultSchema.parse(data);
}
