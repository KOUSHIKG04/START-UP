// Bootstrap API contract. Regenerate from the hosted public schema after migration.
// The functions below are local, pending RPCs until their migrations are applied.
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: {
      publish_doctor_service_session: { Args: { p_practice_id: string; p_mode: string; p_starts_at: string; p_ends_at: string; p_slot_minutes: number; p_fee_minor: number; p_currency: string }; Returns: string };
      publish_selected_doctor_slots: { Args: { p_practice_id: string; p_mode: string; p_slot_starts: string[]; p_slot_minutes: number; p_fee_minor: number; p_currency: string }; Returns: string[] };
      get_my_doctor_daily_slot_usage: { Args: { p_practice_id: string; p_local_day: string }; Returns: unknown };
      publish_online_session: { Args: { p_practice_id: string; p_starts_at: string; p_ends_at: string; p_slot_minutes: number; p_fee_minor: number; p_currency: string }; Returns: string };
      list_care_appointments: { Args: { p_practice_id?: string | null }; Returns: unknown };
      get_online_join_context: { Args: { p_appointment_id: string }; Returns: unknown };
      can_read_online_visit: { Args: { p_appointment_id: string }; Returns: boolean };
      send_online_message: { Args: { p_appointment_id: string; p_client_nonce: string; p_body: string }; Returns: string };
      list_online_messages: { Args: { p_appointment_id: string }; Returns: unknown };
      start_online_appointment: { Args: { p_appointment_id: string }; Returns: string };
      complete_online_appointment: { Args: { p_appointment_id: string; p_assessment: string }; Returns: string };
      is_company_reviewer: { Args: Record<string, never>; Returns: boolean };
      list_company_verification_cases: { Args: Record<string, never>; Returns: unknown };
      get_company_verification_case: { Args: { p_case_id: string }; Returns: unknown };
      list_company_doctor_facility_requests: { Args: { p_case_id: string }; Returns: unknown };
      get_company_facility_bed_declaration: { Args: { p_case_id: string }; Returns: unknown };
      review_company_verification_document: {
        Args: { p_document_id: string; p_decision: string; p_reason?: string | null };
        Returns: unknown;
      };
      finalize_company_verification: {
        Args: { p_case_id: string; p_driver_details?: Record<string, unknown> | null };
        Returns: unknown;
      };
      get_my_verification_case: { Args: { p_subject_type: string; p_subject_id: string }; Returns: unknown };
      submit_my_facility_verification: {
        Args: { p_facility_id: string; p_registration_number: string; p_certificate_path: string; p_operating_licence_path: string };
        Returns: string;
      };
      get_my_profile: { Args: Record<string, never>; Returns: unknown };
      register_my_expo_push_token: { Args: { p_installation_id: string; p_token: string }; Returns: string };
      revoke_my_expo_push_token: { Args: { p_installation_id: string }; Returns: void };
      list_my_notifications: { Args: Record<string, never>; Returns: unknown };
      mark_my_notifications_read: { Args: { p_ids?: string[] | null }; Returns: number };
      complete_onboarding: {
        Args: { p_kind: string; p_details: Record<string, unknown> };
        Returns: unknown;
      };
      update_my_owned_clinic_location: {
        Args: { p_facility_id: string; p_location: Record<string, unknown> };
        Returns: unknown;
      };
      complete_patient_profile: { Args: { p_profile: Record<string, unknown> }; Returns: unknown };
      add_my_family_profile: { Args: { p_profile: Record<string, unknown> }; Returns: string };
      list_my_family_profiles: { Args: Record<string, never>; Returns: unknown };
      get_my_patient_profile_detail: { Args: Record<string, never>; Returns: unknown };
      submit_my_doctor_claim: { Args: { p_claim: Record<string, unknown> }; Returns: boolean };
      submit_my_doctor_claim_for_facility: { Args: { p_claim: Record<string, unknown>; p_facility_id: string }; Returns: string };
      register_my_care_facility: { Args: { p_registration: Record<string, unknown> }; Returns: string };
      list_bed_type_catalog: { Args: Record<string, never>; Returns: unknown };
      list_registered_care_facilities: { Args: Record<string, never>; Returns: unknown };
      request_my_doctor_facility: { Args: { p_facility_id: string }; Returns: string };
      list_my_doctor_facility_requests: { Args: Record<string, never>; Returns: unknown };
      list_my_facility_doctor_requests: { Args: Record<string, never>; Returns: unknown };
      decide_my_facility_doctor_request: { Args: { p_request_id: string; p_approve: boolean; p_reason?: string | null }; Returns: unknown };
      invite_doctor_to_my_facility: { Args: { p_facility_id: string; p_doctor_code: string; p_name: string; p_specialization?: string | null; p_phone?: string | null }; Returns: string };
      respond_to_my_facility_invitation: { Args: { p_request_id: string; p_accept: boolean }; Returns: unknown };
      submit_my_doctor_degree: { Args: { p_degree_path: string }; Returns: boolean };
      has_my_doctor_claim: { Args: Record<string, never>; Returns: boolean };
      create_driver_invitation: {
        Args: { p_organization_id: string; p_phone: string };
        Returns: string;
      };
      list_my_practices: { Args: Record<string, never>; Returns: unknown };
      list_my_facility_doctors: { Args: Record<string, never>; Returns: unknown };
      list_my_clinic_sessions: { Args: { p_practice_id: string }; Returns: unknown };
      list_public_hospitals: { Args: { p_latitude?: number | null; p_longitude?: number | null; p_limit?: number }; Returns: unknown };
      request_ambulance_booking: {
        Args: { p_patient_id: string; p_pickup_latitude: number; p_pickup_longitude: number; p_pickup_address: string;
          p_destination_facility_id: string; p_capability_code: string; p_idempotency_key: string };
        Returns: string;
      };
      list_my_ambulance_bookings: { Args: Record<string, never>; Returns: unknown };
      submit_my_ambulance_review: { Args: { p_booking_id: string; p_rating: number }; Returns: string };
      cancel_my_ambulance_booking: { Args: { p_booking_id: string; p_expected_version: number }; Returns: string };
      refresh_my_ambulance_dispatch: { Args: { p_booking_id: string }; Returns: number };
      list_my_driver_offers: { Args: Record<string, never>; Returns: unknown };
      respond_my_driver_offer: { Args: { p_offer_id: string; p_accept: boolean }; Returns: string | null };
      list_my_driver_trips: { Args: Record<string, never>; Returns: unknown };
      transition_my_driver_trip: { Args: { p_trip_id: string; p_expected_version: number; p_action: string }; Returns: string };
      complete_my_driver_trip: { Args: { p_trip_id: string; p_pin: string }; Returns: boolean };
      get_my_patient_verification_pin: { Args: { p_patient_id: string }; Returns: string };
      update_my_driver_location: { Args: { p_shift_id: string; p_latitude: number; p_longitude: number;
        p_accuracy_meters: number; p_device_at: string; p_stream_epoch: string; p_sequence: number }; Returns: boolean };
      get_my_active_ambulance_tracking: { Args: { p_booking_id: string }; Returns: unknown };
      request_my_sos: { Args: { p_patient_id: string; p_pickup_latitude: number; p_pickup_longitude: number;
        p_pickup_address: string; p_summary: string; p_idempotency_key: string }; Returns: string };
      register_my_ambulance_vehicle: {
        Args: { p_registration_number: string; p_display_label: string; p_inspection_expires_on: string;
          p_capability_code: string; p_equipment_notes: string; p_crew_notes: string };
        Returns: string;
      };
      list_my_ambulance_fleet: { Args: Record<string, never>; Returns: unknown };
      get_my_driver_profile: { Args: Record<string, never>; Returns: unknown };
      get_my_driver_registration_application: { Args: Record<string, never>; Returns: unknown };
      save_my_driver_registration_details: { Args: { p_details: Record<string, unknown> }; Returns: unknown };
      submit_my_driver_registration_application: { Args: { p_vehicle: Record<string, unknown>; p_documents: Record<string, string> }; Returns: unknown };
      update_my_driver_profile: { Args: { p_profile: Record<string, unknown> }; Returns: unknown };
      submit_my_driver_vehicle: { Args: { p_details: Record<string, unknown>; p_documents: Record<string, string> }; Returns: string };
      set_my_driver_availability: {
        Args: { p_vehicle_id: string; p_online: boolean; p_latitude?: number | null; p_longitude?: number | null };
        Returns: string | null;
      };
      set_clinic_auto_confirm_limit: {
        Args: { p_session_id: string; p_expected_version: number; p_limit: number };
        Returns: string;
      };
      list_clinic_unavailability: { Args: { p_practice_id: string }; Returns: unknown };
      add_clinic_unavailability: {
        Args: { p_practice_id: string; p_starts_at: string; p_ends_at: string; p_reason: string };
        Returns: string;
      };
      revoke_clinic_unavailability: {
        Args: { p_exception_id: string; p_expected_version: number };
        Returns: string;
      };
      publish_clinic_session: {
        Args: {
          p_practice_id: string;
          p_starts_at: string;
          p_ends_at: string;
          p_slot_minutes: number;
          p_fee_minor: number;
          p_currency: string;
        };
        Returns: string;
      };
      list_clinic_slots: {
        Args: { p_after?: string; p_limit?: number };
        Returns: unknown;
      };
      book_clinic_appointment: {
        Args: {
          p_patient_id: string;
          p_window_id: string;
          p_practice_service_id: string;
          p_reason: string;
          p_idempotency_key: string;
        };
        Returns: string;
      };
      list_clinic_appointments: {
        Args: { p_practice_id?: string | null };
        Returns: unknown;
      };
      transition_clinic_appointment: {
        Args: {
          p_appointment_id: string;
          p_expected_version: number;
          p_action: string;
          p_note?: string | null;
        };
        Returns: string;
      };
      issue_clinic_checkin_token: { Args: { p_appointment_id: string }; Returns: string };
      redeem_clinic_checkin_token: { Args: { p_token: string }; Returns: string };
      list_my_inventory_facilities: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      list_facility_bed_inventory: {
        Args: { p_facility_id: string };
        Returns: unknown;
      };
      update_facility_bed_inventory: {
        Args: {
          p_facility_id: string;
          p_bed_type_id: string;
          p_total: number;
          p_occupied: number;
          p_maintenance: number;
          p_expected_version: string;
        };
        Returns: unknown;
      };
      list_public_practices: {
        Args: { p_limit?: number };
        Returns: {
          doctor_code: string;
          doctor_name: string;
          facility_code: string;
          facility_name: string;
          service_code: string;
          service_name: string;
          fee_minor: string;
          currency: string;
        }[];
      };
      search_public_practices: {
        Args: {
          p_query?: string | null;
          p_specialty_code?: string | null;
          p_latitude?: number | null;
          p_longitude?: number | null;
          p_limit?: number;
          p_practice_id?: string | null;
        };
        Returns: unknown;
      };
      list_practice_clinic_slots: {
        Args: {
          p_practice_id: string;
          p_service_id?: string | null;
          p_after?: string;
          p_limit?: number;
        };
        Returns: unknown;
      };
      get_my_doctor_profile: { Args: Record<string, never>; Returns: unknown };
      get_my_doctor_presence: { Args: Record<string, never>; Returns: boolean };
      set_my_doctor_presence: { Args: { p_present: boolean }; Returns: boolean };
      get_my_schedule_preferences: { Args: { p_practice_id: string }; Returns: unknown };
      save_my_schedule_preferences: { Args: { p_practice_id: string; p_settings: Record<string, unknown>; p_expected_version: number }; Returns: unknown };
      update_my_doctor_profile: {
        Args: { p_full_name: string; p_bio: string | null; p_languages: string[] };
        Returns: unknown;
      };
      get_public_practice_bio: {
        Args: { p_practice_id: string; p_service_id: string };
        Returns: string | null;
      };
      list_my_clinical_records: { Args: Record<string, never>; Returns: unknown };
      record_consultation_vital: {
        Args: { p_appointment_id: string; p_code: string; p_value: number; p_unit: string };
        Returns: string;
      };
      record_consultation_diagnosis: {
        Args: { p_appointment_id: string; p_description: string; p_is_primary: boolean };
        Returns: string;
      };
      issue_consultation_prescription: {
        Args: { p_appointment_id: string; p_items: unknown; p_timezone: string };
        Returns: string;
      };
      recommend_consultation_followup: {
        Args: { p_appointment_id: string; p_date: string; p_timezone: string; p_reason: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
