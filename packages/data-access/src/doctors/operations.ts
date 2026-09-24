import { doctorProfileSchema, updateDoctorProfileSchema } from "@startup/contracts";
import type { UpdateDoctorProfileInput } from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function getMyDoctorProfile(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("get_my_doctor_profile");
  if (error) throw error;
  return data === null ? null : doctorProfileSchema.parse(data);
}

export async function updateMyDoctorProfile(client: AppSupabaseClient, input: UpdateDoctorProfileInput) {
  const request = updateDoctorProfileSchema.parse(input);
  const { data, error } = await client.rpc("update_my_doctor_profile", {
    p_full_name: request.fullName,
    p_bio: request.bio,
    p_languages: request.languages,
  });
  if (error) throw error;
  return doctorProfileSchema.parse(data);
}
