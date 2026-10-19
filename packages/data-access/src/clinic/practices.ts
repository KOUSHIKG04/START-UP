import { clinicPracticeSchema } from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function listMyPractices(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("list_my_practices");
  if (error) throw error;
  return clinicPracticeSchema.array().parse(data);
}
