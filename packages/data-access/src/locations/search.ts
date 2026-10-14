import { mapSearchInputSchema, mapSearchResultSchema, mapPointInputSchema, mapAddressResultSchema } from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";
import { mapFunctionError } from "./functionErrors";
async function invokeMapFunction(client: AppSupabaseClient, name: string, body: Record<string, unknown>) {
  let result = await client.functions.invoke(name, { body });
  // A resumed development build can retain an expired token. Refresh once;
  // never remove JWT verification or retry requests indefinitely.
  if (result.error?.context?.status === 401) {
    const refreshed = await client.auth.refreshSession();
    if (!refreshed.error && refreshed.data.session) result = await client.functions.invoke(name, { body });
  }
  return result;
}
export async function searchMapPlaces(client: AppSupabaseClient, input: { query: string; latitude?: number; longitude?: number }) {
  const { data, error } = await invokeMapFunction(client, "search-map-places", mapSearchInputSchema.parse(input));
  if (error) throw new Error(await mapFunctionError(error, "Place search"));
  return mapSearchResultSchema.parse(data);
}

export async function resolveMapAddress(client: AppSupabaseClient, input: { latitude: number; longitude: number }) {
  const { data, error } = await invokeMapFunction(client, "resolve-map-address", mapPointInputSchema.parse(input));
  if (error) throw new Error(await mapFunctionError(error, "Address lookup"));
  return mapAddressResultSchema.parse(data);
}
