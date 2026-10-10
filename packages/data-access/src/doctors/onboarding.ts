import {
  clinicOperatingLicencePathSchema,
  ageFromBirthDate,
  doctorBirthDateSchema,
  doctorContactEmailSchema,
  doctorQualificationSchema,
  doctorSpecialtiesSchema,
} from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export type DoctorClaim = {
  ageYears: number;
  dateOfBirth?: string;
  gender: string;
  specialty: string;
  specialties?: string[];
  qualification: string;
  language: string;
  facilityName: string;
  facilityId?: string;
  email: string;
  phone: string;
  licensePath: string;
  degreePath: string;
  clinicLicensePath?: string;
};

export async function submitMyDoctorClaim(
  client: AppSupabaseClient,
  claim: DoctorClaim
) {
  const birthDate =
    claim.dateOfBirth === undefined
      ? undefined
      : doctorBirthDateSchema.parse(claim.dateOfBirth);
  const specialties = doctorSpecialtiesSchema.parse(
    claim.specialties ?? [claim.specialty]
  );
  const p_claim = {
    age_years: birthDate ? ageFromBirthDate(birthDate)! : claim.ageYears,
    ...(birthDate ? { birth_date: birthDate } : {}),
    gender: claim.gender,
    specialty: specialties[0],
    specialties,
    qualification: doctorQualificationSchema.parse(claim.qualification),
    language: claim.language,
    facility_name: claim.facilityName,
    email: doctorContactEmailSchema.parse(claim.email),
    phone: claim.phone,
    license_path: claim.licensePath,
    degree_path: claim.degreePath,
    ...(claim.clinicLicensePath
      ? {
          clinic_license_path: clinicOperatingLicencePathSchema.parse(
            claim.clinicLicensePath
          ),
        }
      : {}),
  };

  const { error } = claim.facilityId
    ? await client.rpc("submit_my_doctor_claim_for_facility", {
        p_claim,
        p_facility_id: claim.facilityId,
      })
    : await client.rpc("submit_my_doctor_claim", { p_claim });

  if (error) throw error;
}

export async function submitMyDoctorQualification(
  client: AppSupabaseClient,
  qualification: string
) {
  const { data, error } = await client.rpc("submit_my_doctor_qualification", {
    p_qualification: doctorQualificationSchema.parse(qualification),
  });

  if (error) throw error;

  return data === true;
}

export async function submitMyDoctorDegree(
  client: AppSupabaseClient,
  degreePath: string
) {
  const { error } = await client.rpc("submit_my_doctor_degree", {
    p_degree_path: degreePath,
  });

  if (error) throw error;
}

export async function hasMyDoctorClaim(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("has_my_doctor_claim");

  if (error) throw error;

  return data;
}

export async function submitMyClinicOperatingLicence(
  client: AppSupabaseClient,
  storagePath: string
) {
  const { error } = await client.rpc("submit_my_clinic_operating_licence", {
    p_storage_path: clinicOperatingLicencePathSchema.parse(storagePath),
  });
  if (error) throw error;
}
