import {
  patientProfileInputSchema,
  familyProfileInputSchema,
  familyProfileListSchema,
  patientProfileDetailSchema,
} from "@startup/contracts";
import type {
  PatientProfileInput,
  FamilyProfileInput,
} from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function completePatientProfile(
  client: AppSupabaseClient,
  details: PatientProfileInput
) {
  const value = patientProfileInputSchema.parse(details);
  const { data, error } = await client.rpc("complete_patient_profile", {
    p_profile: {
      full_name: value.fullName,
      age_years: value.age,
      gender: value.gender,
      blood_group: value.bloodGroup,
      email: value.email ?? "",
      ...(value.address ? { address: value.address } : {}),
    },
  });
  if (error) throw error;
  return data;
}

export async function addMyFamilyProfile(
  client: AppSupabaseClient,
  details: FamilyProfileInput
) {
  const value = familyProfileInputSchema.parse(details);
  const { data, error } = await client.rpc("add_my_family_profile", {
    p_profile: {
      full_name: value.fullName,
      age_years: value.age,
      gender: value.gender,
      blood_group: value.bloodGroup,
      relation: value.relation,
      phone: value.phone,
      notify: value.notify,
    },
  });
  if (error) throw error;
  return data;
}

export async function listMyFamilyProfiles(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("list_my_family_profiles");
  if (error) throw error;
  return familyProfileListSchema.parse(data);
}

export async function getMyPatientProfileDetail(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("get_my_patient_profile_detail");
  if (error) throw error;
  if (data === null) return null;
  return patientProfileDetailSchema.parse(data);
}
