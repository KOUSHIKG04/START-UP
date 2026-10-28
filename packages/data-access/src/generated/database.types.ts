import type { Database as HostedDatabase } from "./supabase.types";
import type { Json } from "./supabase.types";

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
      get_appointment_booking_options: {
        Args: { p_window_id: string; p_practice_service_id: string };
        Returns: Json;
      };
      prepare_home_visit_booking: {
        Args: {
          p_patient_id: string;
          p_window_id: string;
          p_practice_service_id: string;
          p_reason: string;
          p_idempotency_key: string;
          p_location_id: string;
        };
        Returns: Json;
      };
      prepare_appointment_booking: {
        Args: {
          p_patient_id: string;
          p_window_id: string;
          p_practice_service_id: string;
          p_reason: string;
          p_idempotency_key: string;
          p_payment_method: string;
        };
        Returns: Json;
      };
      release_appointment_booking: {
        Args: { p_appointment_id: string };
        Returns: undefined;
      };
      has_company_finance_access: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      get_company_payment_setup: { Args: Record<string, never>; Returns: Json };
      list_payout_entries: {
        Args: { p_appointment_id: string | null; p_before_id: string | null };
        Returns: Json;
      };
      manage_company_payments: {
        Args: { p_action: string; p_data: Json };
        Returns: Json;
      };
      get_ambulance_billing: { Args: { p_booking_id: string }; Returns: Json };
      record_ambulance_cash: {
        Args: {
          p_booking_id: string;
          p_quote_id: string;
          p_expected_amount: number;
          p_note: string;
        };
        Returns: string;
      };
      get_appointment_billing: {
        Args: { p_appointment_id: string };
        Returns: Json;
      };
      record_appointment_cash: {
        Args: {
          p_appointment_id: string;
          p_expected_due: number;
          p_note: string;
        };
        Returns: string;
      };
      confirm_appointment_cash_refund: {
        Args: { p_refund_id: string; p_note: string };
        Returns: undefined;
      };
      request_appointment_refund: {
        Args: {
          p_appointment_id: string;
          p_kind: string;
          p_reason: string;
          p_expected_amount: number;
          p_expected_deduction: number;
        };
        Returns: string;
      };
      decide_appointment_refund: {
        Args: {
          p_refund_id: string;
          p_expected_version: number;
          p_approve: boolean;
          p_note: string;
        };
        Returns: string;
      };
      list_appointment_reschedule_options: {
        Args: { p_appointment_id: string };
        Returns: Json;
      };
      reschedule_appointment: {
        Args: {
          p_appointment_id: string;
          p_expected_version: number;
          p_target_window_id: string;
          p_reason: string;
          p_idempotency_key: string;
        };
        Returns: Json;
      };
      request_appointment_review: {
        Args: {
          p_appointment_id: string;
          p_expected_version: number;
          p_reason: string;
        };
        Returns: string;
      };
      resolve_appointment_attendance: {
        Args: {
          p_appointment_id: string;
          p_expected_version: number;
          p_outcome: string;
          p_note: string;
        };
        Returns: string;
      };
      decide_appointment_recovery: {
        Args: {
          p_request_id: string;
          p_expected_version: number;
          p_approve: boolean;
          p_note: string;
        };
        Returns: Json;
      };
      set_appointment_recovery_policy: {
        Args: {
          p_practice_id: string;
          p_expected_version: number;
          p_online_grace_minutes: number;
          p_reschedule_cutoff_minutes: number;
          p_max_self_reschedules: number;
        };
        Returns: Json;
      };
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
