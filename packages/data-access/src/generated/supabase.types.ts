export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      online_message: {
        Row: {
          appointment_id: string
          body: string
          client_nonce: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          appointment_id: string
          body: string
          client_nonce: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          appointment_id?: string
          body?: string
          client_nonce?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_clinic_unavailability: {
        Args: {
          p_ends_at: string
          p_practice_id: string
          p_reason: string
          p_starts_at: string
        }
        Returns: string
      }
      add_doctor_unavailability: {
        Args: {
          p_ends_at: string
          p_practice_id: string
          p_reason: string
          p_service_mode: string
          p_starts_at: string
        }
        Returns: string
      }
      add_doctor_unavailability_for_services: {
        Args: {
          p_ends_at: string
          p_practice_id: string
          p_reason: string
          p_service_modes: string[]
          p_starts_at: string
        }
        Returns: string[]
      }
      add_my_family_profile: { Args: { p_profile: Json }; Returns: string }
      authorize_ambulance_hospital_lookup: { Args: never; Returns: boolean }
      authorize_map_place_lookup: { Args: never; Returns: boolean }
      book_clinic_appointment: {
        Args: {
          p_idempotency_key: string
          p_patient_id: string
          p_practice_service_id: string
          p_reason: string
          p_window_id: string
        }
        Returns: string
      }
      can_read_online_visit: {
        Args: { p_appointment_id: string }
        Returns: boolean
      }
      can_receive_app_live_events: {
        Args: { p_topic: string }
        Returns: boolean
      }
      can_receive_facility_association_events: {
        Args: { p_topic: string }
        Returns: boolean
      }
      can_upload_provider_photo: { Args: never; Returns: boolean }
      cancel_my_ambulance_booking: {
        Args: { p_booking_id: string; p_expected_version: number }
        Returns: string
      }
      claim_expo_push_deliveries: { Args: { p_limit?: number }; Returns: Json }
      claim_expo_push_receipts: { Args: { p_limit?: number }; Returns: Json }
      complete_my_driver_trip: {
        Args: { p_pin: string; p_trip_id: string }
        Returns: boolean
      }
      complete_onboarding: {
        Args: { p_details: Json; p_kind: string }
        Returns: Json
      }
      complete_online_appointment: {
        Args: { p_appointment_id: string; p_assessment: string }
        Returns: string
      }
      complete_patient_profile: { Args: { p_profile: Json }; Returns: Json }
      create_driver_invitation: {
        Args: { p_organization_id: string; p_phone: string }
        Returns: string
      }
      decide_my_facility_doctor_request: {
        Args: { p_approve: boolean; p_reason?: string; p_request_id: string }
        Returns: Json
      }
      delete_my_doctor_location: {
        Args: { p_location_id: string }
        Returns: boolean
      }
      delete_my_driver_location: {
        Args: { p_location_id: string }
        Returns: boolean
      }
      delete_my_patient_location: {
        Args: { p_location_id: string }
        Returns: boolean
      }
      dismiss_my_notification: { Args: { p_id: string }; Returns: boolean }
      finalize_company_verification: {
        Args: { p_case_id: string; p_driver_details?: Json }
        Returns: Json
      }
      get_company_facility_bed_declaration: {
        Args: { p_case_id: string }
        Returns: Json
      }
      get_company_verification_case: {
        Args: { p_case_id: string }
        Returns: Json
      }
      get_doctor_consultation_draft: {
        Args: { p_appointment_id: string }
        Returns: Json
      }
      get_my_active_ambulance_tracking: {
        Args: { p_booking_id: string }
        Returns: Json
      }
      get_my_doctor_daily_slot_usage: {
        Args: { p_local_day: string; p_practice_id: string }
        Returns: Json
      }
      get_my_doctor_personal_address: { Args: never; Returns: Json }
      get_my_doctor_presence: { Args: never; Returns: boolean }
      get_my_doctor_profile: { Args: never; Returns: Json }
      get_my_doctor_review: {
        Args: { p_appointment_id: string }
        Returns: Json
      }
      get_my_driver_profile: { Args: never; Returns: Json }
      get_my_driver_registration_application: { Args: never; Returns: Json }
      get_my_patient_profile_detail: { Args: never; Returns: Json }
      get_my_patient_verification_pin: {
        Args: { p_patient_id: string }
        Returns: string
      }
      get_my_profile: { Args: never; Returns: Json }
      get_my_schedule_preferences: {
        Args: { p_practice_id: string }
        Returns: Json
      }
      get_my_verification_case: {
        Args: { p_subject_id: string; p_subject_type: string }
        Returns: Json
      }
      get_online_join_context: {
        Args: { p_appointment_id: string }
        Returns: Json
      }
      get_public_practice_bio: {
        Args: { p_practice_id: string; p_service_id: string }
        Returns: string
      }
      has_my_doctor_claim: { Args: never; Returns: boolean }
      invite_doctor_to_my_facility: {
        Args: {
          p_doctor_code: string
          p_facility_id: string
          p_name: string
          p_phone?: string
          p_specialization?: string
        }
        Returns: string
      }
      is_company_reviewer: { Args: never; Returns: boolean }
      issue_clinic_checkin_token: {
        Args: { p_appointment_id: string }
        Returns: string
      }
      issue_consultation_prescription: {
        Args: { p_appointment_id: string; p_items: Json; p_timezone: string }
        Returns: string
      }
      list_bed_type_catalog: { Args: never; Returns: Json }
      list_care_appointments: {
        Args: { p_practice_id?: string }
        Returns: Json
      }
      list_clinic_appointments: {
        Args: { p_practice_id?: string }
        Returns: Json
      }
      list_clinic_slots: {
        Args: { p_after?: string; p_limit?: number }
        Returns: Json
      }
      list_clinic_unavailability: {
        Args: { p_practice_id: string }
        Returns: Json
      }
      list_company_doctor_facility_requests: {
        Args: { p_case_id: string }
        Returns: Json
      }
      list_company_verification_cases: { Args: never; Returns: Json }
      list_facility_bed_inventory: {
        Args: { p_facility_id: string }
        Returns: Json
      }
      list_my_ambulance_bookings: { Args: never; Returns: Json }
      list_my_ambulance_fleet: { Args: never; Returns: Json }
      list_my_clinic_sessions: {
        Args: { p_practice_id: string }
        Returns: Json
      }
      list_my_clinical_records: { Args: never; Returns: Json }
      list_my_doctor_facility_requests: { Args: never; Returns: Json }
      list_my_doctor_locations: { Args: never; Returns: Json }
      list_my_driver_locations: { Args: never; Returns: Json }
      list_my_driver_offers: { Args: never; Returns: Json }
      list_my_driver_trips: { Args: never; Returns: Json }
      list_my_facility_doctor_requests: { Args: never; Returns: Json }
      list_my_facility_doctors: { Args: never; Returns: Json }
      list_my_family_profiles: { Args: never; Returns: Json }
      list_my_inventory_facilities: { Args: never; Returns: Json }
      list_my_notifications: { Args: never; Returns: Json }
      list_my_patient_locations: { Args: never; Returns: Json }
      list_my_practices: { Args: never; Returns: Json }
      list_online_messages: {
        Args: { p_appointment_id: string }
        Returns: Json
      }
      list_practice_clinic_slots: {
        Args: {
          p_after?: string
          p_limit?: number
          p_practice_id: string
          p_service_id?: string
        }
        Returns: Json
      }
      list_practice_service_slots: {
        Args: {
          p_after?: string
          p_limit?: number
          p_mode: string
          p_practice_id: string
          p_service_id?: string
        }
        Returns: Json
      }
      list_public_doctor_practices: {
        Args: {
          p_latitude?: number
          p_longitude?: number
          p_practice_id: string
          p_service_mode?: string
        }
        Returns: Json
      }
      list_public_hospitals: {
        Args: { p_latitude?: number; p_limit?: number; p_longitude?: number }
        Returns: Json
      }
      list_public_practices: {
        Args: { p_limit?: number }
        Returns: {
          currency: string
          doctor_code: string
          doctor_name: string
          facility_code: string
          facility_name: string
          fee_minor: string
          service_code: string
          service_name: string
        }[]
      }
      list_registered_care_facilities: { Args: never; Returns: Json }
      mark_my_notifications_read: {
        Args: { p_ids?: string[] }
        Returns: number
      }
      publish_clinic_session: {
        Args: {
          p_currency: string
          p_ends_at: string
          p_fee_minor: number
          p_practice_id: string
          p_slot_minutes: number
          p_starts_at: string
        }
        Returns: string
      }
      publish_doctor_schedule: {
        Args: {
          p_expected_version: number
          p_mode: string
          p_practice_id: string
          p_settings: Json
        }
        Returns: Json
      }
      publish_doctor_schedule_from_date: {
        Args: {
          p_effective_from: string
          p_expected_version: number
          p_mode: string
          p_practice_id: string
          p_settings: Json
        }
        Returns: Json
      }
      publish_doctor_service_session: {
        Args: {
          p_currency: string
          p_ends_at: string
          p_fee_minor: number
          p_mode: string
          p_practice_id: string
          p_slot_minutes: number
          p_starts_at: string
        }
        Returns: string
      }
      publish_online_session: {
        Args: {
          p_currency: string
          p_ends_at: string
          p_fee_minor: number
          p_practice_id: string
          p_slot_minutes: number
          p_starts_at: string
        }
        Returns: string
      }
      publish_selected_doctor_slots: {
        Args: {
          p_currency: string
          p_fee_minor: number
          p_mode: string
          p_practice_id: string
          p_slot_minutes: number
          p_slot_starts: string[]
        }
        Returns: string[]
      }
      recommend_consultation_followup: {
        Args: {
          p_appointment_id: string
          p_date: string
          p_reason: string
          p_timezone: string
        }
        Returns: string
      }
      record_consultation_diagnosis: {
        Args: {
          p_appointment_id: string
          p_description: string
          p_is_primary?: boolean
        }
        Returns: string
      }
      record_consultation_intake: {
        Args: { p_appointment_id: string; p_diagnosis?: string; p_vitals: Json }
        Returns: string
      }
      record_consultation_vital: {
        Args: {
          p_appointment_id: string
          p_code: string
          p_unit: string
          p_value: number
        }
        Returns: string
      }
      redeem_clinic_checkin_token: {
        Args: { p_token: string }
        Returns: string
      }
      refresh_my_ambulance_dispatch: {
        Args: { p_booking_id: string }
        Returns: number
      }
      register_my_ambulance_vehicle: {
        Args: {
          p_capability_code: string
          p_crew_notes: string
          p_display_label: string
          p_equipment_notes: string
          p_inspection_expires_on: string
          p_registration_number: string
        }
        Returns: string
      }
      register_my_care_facility: {
        Args: { p_registration: Json }
        Returns: string
      }
      register_my_expo_push_token: {
        Args: { p_installation_id: string; p_token: string }
        Returns: string
      }
      request_ambulance_booking: {
        Args: {
          p_capability_code: string
          p_destination_facility_id: string
          p_idempotency_key: string
          p_patient_id: string
          p_pickup_address: string
          p_pickup_latitude: number
          p_pickup_longitude: number
        }
        Returns: string
      }
      request_google_ambulance_booking: {
        Args: {
          p_auth_user_id: string
          p_capability_code: string
          p_destination_address: string
          p_destination_latitude: number
          p_destination_longitude: number
          p_destination_name: string
          p_destination_place_id: string
          p_idempotency_key: string
          p_patient_id: string
          p_pickup_address: string
          p_pickup_latitude: number
          p_pickup_longitude: number
        }
        Returns: string
      }
      request_my_doctor_facility: {
        Args: { p_facility_id: string }
        Returns: string
      }
      request_my_sos: {
        Args: {
          p_idempotency_key: string
          p_patient_id: string
          p_pickup_address: string
          p_pickup_latitude: number
          p_pickup_longitude: number
          p_summary: string
        }
        Returns: string
      }
      request_onboarding_sos: { Args: { p_details: Json }; Returns: string }
      resolve_expo_push_receipt: {
        Args: {
          p_delivered: boolean
          p_delivery_id: string
          p_error_code?: string
        }
        Returns: undefined
      }
      resolve_expo_push_ticket: {
        Args: {
          p_delivery_id: string
          p_error_code?: string
          p_ticket_id: string
        }
        Returns: undefined
      }
      respond_my_driver_offer: {
        Args: { p_accept: boolean; p_offer_id: string }
        Returns: string
      }
      respond_to_my_facility_invitation: {
        Args: { p_accept: boolean; p_request_id: string }
        Returns: Json
      }
      review_company_verification_document: {
        Args: { p_decision: string; p_document_id: string; p_reason?: string }
        Returns: Json
      }
      revoke_clinic_unavailability: {
        Args: { p_exception_id: string; p_expected_version: number }
        Returns: string
      }
      revoke_my_expo_push_token: {
        Args: { p_installation_id: string }
        Returns: undefined
      }
      save_my_doctor_location: {
        Args: { p_location: Json; p_location_id?: string }
        Returns: string
      }
      save_my_doctor_profile_with_address: {
        Args: {
          p_address: Json
          p_bio: string
          p_full_name: string
          p_languages: string[]
        }
        Returns: Json
      }
      save_my_driver_location: {
        Args: { p_location: Json; p_location_id?: string }
        Returns: string
      }
      save_my_driver_registration_details: {
        Args: { p_details: Json }
        Returns: Json
      }
      save_my_patient_location: {
        Args: { p_location: Json; p_location_id?: string }
        Returns: string
      }
      save_my_schedule_preferences: {
        Args: {
          p_expected_version: number
          p_practice_id: string
          p_settings: Json
        }
        Returns: Json
      }
      search_public_practices: {
        Args: {
          p_latitude?: number
          p_limit?: number
          p_longitude?: number
          p_practice_id?: string
          p_query?: string
          p_specialty_code?: string
        }
        Returns: Json
      }
      search_public_practices_for_mode: {
        Args: {
          p_latitude?: number
          p_limit?: number
          p_longitude?: number
          p_offset?: number
          p_practice_id?: string
          p_query?: string
          p_service_mode?: string
          p_specialty_code?: string
        }
        Returns: Json
      }
      select_my_doctor_location: {
        Args: { p_location_id: string }
        Returns: boolean
      }
      select_my_driver_location: {
        Args: { p_location_id: string }
        Returns: boolean
      }
      select_my_patient_location: {
        Args: { p_location_id: string }
        Returns: boolean
      }
      send_online_message: {
        Args: {
          p_appointment_id: string
          p_body: string
          p_client_nonce: string
        }
        Returns: string
      }
      set_clinic_auto_confirm_limit: {
        Args: {
          p_expected_version: number
          p_limit: number
          p_session_id: string
        }
        Returns: string
      }
      set_my_doctor_presence: { Args: { p_present: boolean }; Returns: boolean }
      set_my_driver_availability: {
        Args: {
          p_latitude?: number
          p_longitude?: number
          p_online: boolean
          p_vehicle_id: string
        }
        Returns: string
      }
      set_my_profile_photo: {
        Args: { p_facility_id?: string; p_kind: string; p_path: string }
        Returns: undefined
      }
      start_online_appointment: {
        Args: { p_appointment_id: string }
        Returns: string
      }
      submit_my_ambulance_review: {
        Args: { p_booking_id: string; p_rating: number }
        Returns: string
      }
      submit_my_clinic_operating_licence: {
        Args: { p_storage_path: string }
        Returns: boolean
      }
      submit_my_doctor_claim: { Args: { p_claim: Json }; Returns: boolean }
      submit_my_doctor_claim_for_facility: {
        Args: { p_claim: Json; p_facility_id: string }
        Returns: string
      }
      submit_my_doctor_degree: {
        Args: { p_degree_path: string }
        Returns: boolean
      }
      submit_my_doctor_qualification: {
        Args: { p_qualification: string }
        Returns: boolean
      }
      submit_my_doctor_review: {
        Args: { p_appointment_id: string; p_comment?: string; p_rating: number }
        Returns: string
      }
      submit_my_driver_registration_application: {
        Args: { p_documents: Json; p_vehicle: Json }
        Returns: Json
      }
      submit_my_driver_vehicle: {
        Args: { p_details: Json; p_documents: Json }
        Returns: string
      }
      submit_my_facility_verification: {
        Args: {
          p_certificate_path: string
          p_facility_id: string
          p_operating_licence_path: string
          p_registration_number: string
        }
        Returns: string
      }
      transition_clinic_appointment: {
        Args: {
          p_action: string
          p_appointment_id: string
          p_expected_version: number
          p_note?: string
        }
        Returns: string
      }
      transition_my_driver_trip: {
        Args: {
          p_action: string
          p_expected_version: number
          p_trip_id: string
        }
        Returns: string
      }
      update_facility_bed_inventory: {
        Args: {
          p_bed_type_id: string
          p_expected_version: number
          p_facility_id: string
          p_maintenance: number
          p_occupied: number
          p_total: number
        }
        Returns: Json
      }
      update_my_doctor_profile: {
        Args: { p_bio: string; p_full_name: string; p_languages: string[] }
        Returns: Json
      }
      update_my_driver_location: {
        Args: {
          p_accuracy_meters: number
          p_device_at: string
          p_latitude: number
          p_longitude: number
          p_sequence: number
          p_shift_id: string
          p_stream_epoch: string
        }
        Returns: boolean
      }
      update_my_driver_profile: { Args: { p_profile: Json }; Returns: Json }
      update_my_family_profile: {
        Args: { p_patient_id: string; p_profile: Json }
        Returns: string
      }
      update_my_owned_clinic_location: {
        Args: { p_facility_id: string; p_location: Json }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
