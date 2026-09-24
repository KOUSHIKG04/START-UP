import type { AppSupabaseClient } from "../client/createSupabaseClient";
import { practiceSearchInputSchema, publicPracticeSchema, uuidSchema } from "@startup/contracts";
import type { PracticeSearchInput } from "@startup/contracts";

export async function searchPublicPractices(client: AppSupabaseClient, input: PracticeSearchInput = {}) {
  const request = practiceSearchInputSchema.parse(input);
  const { data, error } = await client.rpc("search_public_practices", {
    p_query: request.query || null,
    p_specialty_code: request.specialtyCode || null,
    p_latitude: request.latitude ?? null,
    p_longitude: request.longitude ?? null,
    p_limit: request.limit,
    p_practice_id: request.practiceId ?? null,
  });
  if (error) throw error;
  return publicPracticeSchema.array().parse(data);
}

export async function getPublicPracticeBio(client: AppSupabaseClient, practiceId: string, serviceId: string) {
  const { data, error } = await client.rpc("get_public_practice_bio", {
    p_practice_id: uuidSchema.parse(practiceId),
    p_service_id: uuidSchema.parse(serviceId),
  });
  if (error) throw error;
  return data;
}

export async function listPublicPractices(
  client: AppSupabaseClient,
  limit = 20
) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new Error("Limit must be an integer between 1 and 50");
  }
  const { data, error } = await client.rpc("list_public_practices", {
    p_limit: limit,
  });
  if (error) throw error;
  return data;
}
