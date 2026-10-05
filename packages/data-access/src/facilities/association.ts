import type { AppSupabaseClient } from "../client/createSupabaseClient";
import { bedTypeCatalogSchema, doctorFacilityRequestSchema, facilityDoctorRequestSchema, registerCareFacilitySchema, registeredCareFacilitySchema, uuidSchema } from "@startup/contracts";
import type { BedTypeCatalogItem, DoctorFacilityRequest, FacilityDoctorRequest, RegisterCareFacilityInput, RegisteredCareFacility } from "@startup/contracts";

export type { DoctorFacilityRequest, FacilityDoctorRequest, RegisterCareFacilityInput, RegisteredCareFacility };

export async function listBedTypeCatalog(client: AppSupabaseClient): Promise<BedTypeCatalogItem[]> {
  const { data, error } = await client.rpc("list_bed_type_catalog");
  if (error) throw error;
  return bedTypeCatalogSchema.array().parse(data);
}

export async function listRegisteredCareFacilities(client: AppSupabaseClient): Promise<RegisteredCareFacility[]> {
  const { data, error } = await client.rpc("list_registered_care_facilities");
  if (error) throw error;
  return registeredCareFacilitySchema.array().parse(data);
}

export async function requestMyDoctorFacility(client: AppSupabaseClient, facilityId: string): Promise<string> {
  const { data, error } = await client.rpc("request_my_doctor_facility", { p_facility_id: uuidSchema.parse(facilityId) });
  if (error) throw error;
  return data;
}

export async function listMyDoctorFacilityRequests(client: AppSupabaseClient): Promise<DoctorFacilityRequest[]> {
  const { data, error } = await client.rpc("list_my_doctor_facility_requests");
  if (error) throw error;
  return doctorFacilityRequestSchema.array().parse(data);
}

export async function listMyFacilityDoctorRequests(client: AppSupabaseClient): Promise<FacilityDoctorRequest[]> {
  const { data, error } = await client.rpc("list_my_facility_doctor_requests");
  if (error) throw error;
  return facilityDoctorRequestSchema.array().parse(data);
}

export async function decideMyFacilityDoctorRequest(client: AppSupabaseClient, requestId: string, approve: boolean, reason?: string) {
  const { data, error } = await client.rpc("decide_my_facility_doctor_request", {
    p_request_id: uuidSchema.parse(requestId), p_approve: approve, p_reason: reason ?? null,
  });
  if (error) throw error;
  return data;
}

export async function registerMyCareFacility(client: AppSupabaseClient, input: RegisterCareFacilityInput): Promise<string> {
  const { data, error } = await client.rpc("register_my_care_facility", { p_registration: registerCareFacilitySchema.parse(input) });
  if (error) throw error;
  return data;
}

export async function inviteDoctorToMyFacility(client: AppSupabaseClient, input: { facilityId: string; doctorCode: string; name: string; specialization: string; phone: string }): Promise<string> {
  const { data, error } = await client.rpc("invite_doctor_to_my_facility", {
    p_facility_id: uuidSchema.parse(input.facilityId),p_doctor_code:input.doctorCode,p_name:input.name,
    p_specialization:input.specialization,p_phone:input.phone,
  });
  if (error) throw error;
  return data;
}

export async function respondToMyFacilityInvitation(client: AppSupabaseClient, requestId: string, accept: boolean) {
  const { data,error } = await client.rpc("respond_to_my_facility_invitation", {p_request_id:uuidSchema.parse(requestId),p_accept:accept});
  if (error) throw error;
  return data;
}
