import type { Database as HostedDatabase } from "./supabase.types";
export type { Json } from "./supabase.types";

// PostgreSQL introspection does not report RPC argument nullability. Keep the
// existing API's explicit NULL inputs and bigint wire strings in this overlay;
// supabase.types.ts remains the unmodified hosted schema output.
type NullableRpcArguments = {
  record_consultation_intake: "p_diagnosis";
  publish_doctor_schedule_from_date: "p_effective_from";
  set_my_driver_availability: "p_latitude" | "p_longitude";
  list_public_hospitals: "p_latitude" | "p_longitude";
  list_practice_clinic_slots: "p_service_id";
  list_practice_service_slots: "p_service_id";
  list_care_appointments: "p_practice_id";
  transition_clinic_appointment: "p_note";
  save_my_doctor_location: "p_location_id";
  save_my_driver_location: "p_location_id";
  save_my_patient_location: "p_location_id";
  save_my_doctor_profile_with_address: "p_bio";
  update_my_doctor_profile: "p_bio";
  search_public_practices:
    | "p_query"
    | "p_specialty_code"
    | "p_latitude"
    | "p_longitude"
    | "p_practice_id";
  search_public_practices_for_mode:
    | "p_query"
    | "p_specialty_code"
    | "p_latitude"
    | "p_longitude"
    | "p_practice_id";
  submit_my_doctor_review: "p_comment";
  decide_my_facility_doctor_request: "p_reason";
  mark_my_notifications_read: "p_ids";
  set_my_profile_photo: "p_facility_id";
  review_company_verification_document: "p_reason";
};
type HostedFunctions = HostedDatabase["public"]["Functions"];
type WireArgs<Name, Args> = {
  [Key in keyof Args]: Name extends "finalize_company_verification"
    ? Key extends "p_driver_details"
      ? Record<string, unknown> | null
      : Args[Key]
    : Key extends "p_expected_version"
      ? Args[Key] | string
      : Name extends keyof NullableRpcArguments
        ? Key extends NullableRpcArguments[Name]
          ? Args[Key] | null
          : Args[Key]
        : Args[Key];
};
type WireFunctions = {
  [Name in keyof HostedFunctions]: Omit<HostedFunctions[Name], "Args"> & {
    Args: WireArgs<Name, HostedFunctions[Name]["Args"]>;
  };
};
export type Database = Omit<HostedDatabase, "public"> & {
  public: Omit<HostedDatabase["public"], "Functions"> & {
    Functions: WireFunctions & {
      // Local migration; replace with hosted introspection after deployment.
      book_portal_walk_in_appointment: {
        Args: {
          p_practice_id: string;
          p_window_id: string;
          p_practice_service_id: string;
          p_patient_name: string;
          p_patient_age: number | null;
          p_patient_gender: string | null;
          p_check_in: boolean;
          p_patient_phone: string | null;
          p_reason: string | null;
          p_idempotency_key: string;
        };
        Returns: string;
      };
      get_portal_clinic_day: {
        Args: { p_practice_id: string; p_local_day: string | null };
        Returns: import("./supabase.types").Json;
      };
    };
  };
};
