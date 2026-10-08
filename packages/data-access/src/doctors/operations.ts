import {
  doctorProfileSchema,
  ownedClinicLocationSchema,
  updateDoctorProfileSchema,
} from "@startup/contracts";
import type {
  OwnedClinicLocationInput,
  UpdateDoctorProfileInput,
} from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function getMyDoctorProfile(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("get_my_doctor_profile");
  if (error) throw error;
  return data === null ? null : doctorProfileSchema.parse(data);
}

export async function updateMyDoctorProfile(
  client: AppSupabaseClient,
  input: UpdateDoctorProfileInput
) {
  const request = updateDoctorProfileSchema.parse(input);
  const { data, error } = await client.rpc("update_my_doctor_profile", {
    p_full_name: request.fullName,
    p_bio: request.bio,
    p_languages: request.languages,
  });
  if (error) throw error;
  return doctorProfileSchema.parse(data);
}

export async function updateMyOwnedClinicLocation(
  client: AppSupabaseClient,
  input: OwnedClinicLocationInput
) {
  const location = ownedClinicLocationSchema.parse(input);
  const { data, error } = await client.rpc("update_my_owned_clinic_location", {
    p_facility_id: location.facilityId,
    p_location: {
      name: location.name,
      address: location.address,
      locality: location.locality,
      city: location.city,
      state: location.state,
      pincode: location.pincode,
      latitude: location.latitude,
      longitude: location.longitude,
    },
  });
  
  if (error) throw error;
  
  return data;
}
