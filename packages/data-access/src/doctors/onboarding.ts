import type { AppSupabaseClient } from "../client/createSupabaseClient";

export type DoctorClaim = { ageYears: number; gender: string; specialty: string; language: string; facilityName: string; email?: string; phone: string; licensePath: string };

export async function submitMyDoctorClaim(client: AppSupabaseClient, claim: DoctorClaim) {
  const { error } = await client.rpc("submit_my_doctor_claim", { p_claim: { age_years: claim.ageYears, gender: claim.gender, specialty: claim.specialty, language: claim.language, facility_name: claim.facilityName, email: claim.email ?? "", phone: claim.phone, license_path: claim.licensePath } });
  if (error) throw error;
}

export async function hasMyDoctorClaim(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("has_my_doctor_claim");
  if (error) throw error;
  return data;
}
