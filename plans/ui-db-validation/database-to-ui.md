# Database → UI inventory

Baseline: all 79 deployed-model tables. Generated from database-inventory.json plus explicit domain-to-UI review; no table is assumed public. Common IDs, foreign keys and versions may travel as opaque contract values, not editable UI. Hashes/verifiers/pepper keys/leases/request hashes remain backend-only. Clinical and contact fields need role-filtered projections. See per-app reports for missing fields/actions and api-contracts.md for permissions.

## ambulance_assignment

Owner: Dispatch. UI: Driver offer countdown/response; patient assignment state; operator exceptions.

Transactional acceptance/expiry missing; dispatch round internals need diagnostics, not patient controls.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `booking_id`, `offer_id`, `shift_id`, `driver_id`, `vehicle_id`, `accepted_at`, `released_at`, `release_reason`, `driver_name_snapshot`, `vehicle_registration_snapshot`, `operator_name_snapshot`.

Relationships: `booking_id` → `ambulance_booking(id)`; `offer_id` → `dispatch_offer(id)`; `shift_id` → `driver_shift(id)`; `driver_id` → `driver(id)`; `vehicle_id` → `vehicle(id)`; `shift_id,driver_id,vehicle_id` → `driver_shift(id,driver_id,vehicle_id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## ambulance_booking

Owner: Transport booking. UI: Patient request/SOS/destination change; driver/dispatcher request detail.

Participant-scoped request/cancel/reroute APIs missing.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `public_code`, `patient_id`, `requested_by`, `guest_session_id`, `booking_type`, `status`, `priority`, `pickup_position`, `pickup_address`, `destination_facility_id`, `destination_position`, `destination_address`, `patient_name_snapshot`, `contact_phone_snapshot`, `cancel_reason`.

Required state/type reconciliation: `booking_type`: normal / sos; `status`: awaiting_location / searching / assigned / fulfilled / cancelled / unfulfilled.

Relationships: `patient_id` → `patient(id)`; `requested_by` → `identity(id)`; `guest_session_id` → `guest_emergency_session(id)`; `destination_facility_id` → `facility(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## ambulance_review

Owner: Feedback. UI: Patient completion ratings/feedback; public published aggregate; moderation.

Submission/eligibility/moderation APIs missing; average derived.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `trip_id`, `submitted_by`, `driver_rating`, `service_rating`, `comment`, `moderation_state`.

Required state/type reconciliation: `moderation_state`: pending / published / hidden.

Relationships: `trip_id` → `trip(id)`; `submitted_by` → `identity(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## appointment

Owner: Appointments. UI: Patient booking/status/QR; doctor/reception approvals/check-in.

Commands and lifecycle projections missing; QR contains credential, never hash or patient data.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `public_code`, `patient_id`, `session_id`, `window_id`, `practice_service_id`, `source`, `status`, `requested_by`, `confirmed_at`, `capacity_released_at`, `request_expires_at`, `decision_by`, `decision_reason`, `replaces_appointment_id`, `fee_minor`, `currency`, `doctor_name_snapshot`, `facility_name_snapshot`, `facility_address_snapshot`, `service_name_snapshot`, `doctor_registration_snapshot`.

Required state/type reconciliation: `source`: patient_online / reception_walk_in / staff_booking / offline_sync; `status`: pending / confirmed / in_consultation / completed / rejected / cancelled / no_show.

Relationships: `patient_id` → `patient(id)`; `session_id` → `session(id)`; `window_id` → `appointment_window(id)`; `practice_service_id` → `practice_service(id)`; `requested_by` → `identity(id)`; `decision_by` → `identity(id)`; `replaces_appointment_id` → `appointment(id)`; `window_id,session_id` → `appointment_window(id,session_id)`; `session_id,practice_service_id` → `session_service(session_id,practice_service_id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## appointment_checkin

Owner: Appointments. UI: Patient booking/status/QR; doctor/reception approvals/check-in.

Commands and lifecycle projections missing; QR contains credential, never hash or patient data.

Columns (complete baseline): `id`, `created_at`, `appointment_id`, `token_id`, `checked_in_by`, `method`, `reason`.

Required state/type reconciliation: `method`: qr / manual.

Relationships: `appointment_id` → `appointment(id)`; `token_id` → `checkin_token(id)`; `checked_in_by` → `identity(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## appointment_window

Owner: Scheduling. UI: Doctor practice calendar; portal scheduling; patient slots.

Version/publish/exception APIs and UI missing; doctor_booking_day locking/counters backend-only.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `session_id`, `starts_at`, `ends_at`, `hard_capacity`, `state`.

Required state/type reconciliation: `state`: open / blocked.

Relationships: `session_id` → `session(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## audit_log

Owner: Security. UI: Scoped audit/access review, patient delegation where policy requires.

Audit backend-only writes; least-privilege diagnostics; access grants require explicit management.

Columns (complete baseline): `id`, `created_at`, `actor_id`, `guest_session_id`, `actor_kind`, `action`, `resource_type`, `resource_id`, `organization_id`, `facility_id`, `request_id`, `outcome`, `reason`, `metadata`.

Required state/type reconciliation: `actor_kind`: identity / guest / system; `outcome`: allowed / denied / failed.

Relationships: `actor_id` → `identity(id)`; `guest_session_id` → `guest_emergency_session(id)`; `organization_id` → `organization(id)`; `facility_id` → `facility(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## booking_capability

Owner: Transport booking. UI: Patient request/SOS/destination change; driver/dispatcher request detail.

Participant-scoped request/cancel/reroute APIs missing.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `booking_id`, `capability_id`.

Relationships: `booking_id` → `ambulance_booking(id)`; `capability_id` → `capability(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## booking_destination_change

Owner: Transport booking. UI: Patient request/SOS/destination change; driver/dispatcher request detail.

Participant-scoped request/cancel/reroute APIs missing.

Columns (complete baseline): `id`, `created_at`, `booking_id`, `facility_id`, `position`, `address`, `changed_by`, `reason`.

Relationships: `booking_id` → `ambulance_booking(id)`; `facility_id` → `facility(id)`; `changed_by` → `identity(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## capability

Owner: Transport workforce. UI: Driver profile/documents/online; operator eligibility/vehicle management.

Enrollment/review/shift APIs missing; verified capability is not user-selected truth.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `code`, `description`.

## checkin_token

Owner: Appointments. UI: Patient booking/status/QR; doctor/reception approvals/check-in.

Commands and lifecycle projections missing; QR contains credential, never hash or patient data.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `appointment_id`, `token_hash`, `expires_at`, `consumed_at`, `revoked_at`.

Relationships: `appointment_id` → `appointment(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## clinical_access_grant

Owner: Security. UI: Scoped audit/access review, patient delegation where policy requires.

Audit backend-only writes; least-privilege diagnostics; access grants require explicit management.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `patient_id`, `identity_id`, `facility_id`, `granted_by`, `reason`, `expires_at`, `revoked_at`.

Relationships: `patient_id` → `patient(id)`; `identity_id` → `identity(id)`; `facility_id` → `facility(id)`; `granted_by` → `identity(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## clinical_attachment

Owner: Clinical. UI: Doctor entry/history, patient records, follow-up booking.

Clinician signed commands and authorized read/download missing; reception limited to operational status.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `consultation_id`, `uploaded_by`, `storage_key`, `mime_type`, `size_bytes`, `sha256`, `scan_status`.

Required state/type reconciliation: `scan_status`: pending / clean / quarantined.

Relationships: `consultation_id` → `consultation(id)`; `uploaded_by` → `identity(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## clinical_note

Owner: Clinical. UI: Doctor entry/history, patient records, follow-up booking.

Clinician signed commands and authorized read/download missing; reception limited to operational status.

Columns (complete baseline): `id`, `created_at`, `consultation_id`, `author_id`, `kind`, `body`, `signed_at`, `supersedes_id`.

Required state/type reconciliation: `kind`: assessment / advice / addendum / correction.

Relationships: `consultation_id` → `consultation(id)`; `author_id` → `identity(id)`; `supersedes_id` → `clinical_note(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## consultation

Owner: Clinical. UI: Doctor entry/history, patient records, follow-up booking.

Clinician signed commands and authorized read/download missing; reception limited to operational status.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `appointment_id`, `patient_id`, `doctor_id`, `status`, `started_at`, `ended_at`, `signed_at`.

Required state/type reconciliation: `status`: active / signed / amended / void.

Relationships: `appointment_id` → `appointment(id)`; `patient_id` → `patient(id)`; `doctor_id` → `doctor(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## consultation_diagnosis

Owner: Clinical. UI: Doctor entry/history, patient records, follow-up booking.

Clinician signed commands and authorized read/download missing; reception limited to operational status.

Columns (complete baseline): `id`, `created_at`, `consultation_id`, `coding_system`, `code`, `description`, `is_primary`, `recorded_by`, `supersedes_id`.

Relationships: `consultation_id` → `consultation(id)`; `recorded_by` → `identity(id)`; `supersedes_id` → `consultation_diagnosis(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## dispatch_offer

Owner: Dispatch. UI: Driver offer countdown/response; patient assignment state; operator exceptions.

Transactional acceptance/expiry missing; dispatch round internals need diagnostics, not patient controls.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `round_id`, `shift_id`, `status`, `expires_at`, `responded_at`, `reason`, `distance_meters`.

Required state/type reconciliation: `status`: pending / accepted / rejected / expired / withdrawn.

Relationships: `round_id` → `dispatch_round(id)`; `shift_id` → `driver_shift(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## dispatch_round

Owner: Dispatch. UI: Driver offer countdown/response; patient assignment state; operator exceptions.

Transactional acceptance/expiry missing; dispatch round internals need diagnostics, not patient controls.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `booking_id`, `round_number`, `radius_meters`, `status`, `expires_at`.

Required state/type reconciliation: `status`: open / exhausted / matched / cancelled.

Relationships: `booking_id` → `ambulance_booking(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## doctor

Owner: Directory. UI: Patient search/card/profile; doctor profile; portal doctor association.

Limited public directory read exists; detail/search/edit/verification contracts missing.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `identity_id`, `public_code`, `full_name`, `registration_authority`, `registration_number`, `practice_started_on`, `credential_status`, `active`, `booking_timezone`.

Required state/type reconciliation: `credential_status`: pending / verified / suspended.

Relationships: `identity_id` → `identity(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## doctor_booking_day

Owner: Scheduling. UI: Doctor practice calendar; portal scheduling; patient slots.

Version/publish/exception APIs and UI missing; doctor_booking_day locking/counters backend-only.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `doctor_id`, `local_date`, `timezone`, `auto_confirm_limit`.

Relationships: `doctor_id` → `doctor(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## doctor_facility

Owner: Directory. UI: Patient search/card/profile; doctor profile; portal doctor association.

Limited public directory read exists; detail/search/edit/verification contracts missing.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `doctor_id`, `facility_id`, `room_label`, `active`.

Relationships: `doctor_id` → `doctor(id)`; `facility_id` → `facility(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## doctor_language

Owner: Directory. UI: Patient search/card/profile; doctor profile; portal doctor association.

Limited public directory read exists; detail/search/edit/verification contracts missing.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `doctor_id`, `language_code`.

Relationships: `doctor_id` → `doctor(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## doctor_review

Owner: Feedback. UI: Patient completion ratings/feedback; public published aggregate; moderation.

Submission/eligibility/moderation APIs missing; average derived.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `appointment_id`, `rating`, `comment`, `submitted_by`, `moderation_state`.

Required state/type reconciliation: `moderation_state`: pending / published / hidden.

Relationships: `appointment_id` → `appointment(id)`; `submitted_by` → `identity(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## doctor_specialty

Owner: Directory. UI: Patient search/card/profile; doctor profile; portal doctor association.

Limited public directory read exists; detail/search/edit/verification contracts missing.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `doctor_id`, `specialty_id`.

Relationships: `doctor_id` → `doctor(id)`; `specialty_id` → `specialty(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## domain_event

Owner: Infrastructure. UI: No ordinary business UI; restricted operator diagnostics.

Backend-only transaction/event/retry/replay correctness; do not expose payloads or lease fields.

Columns (complete baseline): `id`, `created_at`, `event_type`, `aggregate_type`, `aggregate_id`, `aggregate_version`, `actor_id`, `guest_session_id`, `request_id`, `payload`.

Relationships: `actor_id` → `identity(id)`; `guest_session_id` → `guest_emergency_session(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## driver

Owner: Transport workforce. UI: Driver profile/documents/online; operator eligibility/vehicle management.

Enrollment/review/shift APIs missing; verified capability is not user-selected truth.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `identity_id`, `organization_id`, `public_code`, `full_name`, `license_number`, `license_expires_on`, `verification_status`, `active`.

Required state/type reconciliation: `verification_status`: pending / verified / suspended.

Relationships: `identity_id` → `identity(id)`; `organization_id` → `organization(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## driver_location_latest

Owner: Location. UI: Driver location permission; patient/operator live tracking and sharing.

Restricted ingest/read/share missing; epoch/sequence/backend retention never ordinary UI fields.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `driver_id`, `shift_id`, `stream_epoch`, `sequence`, `position`, `accuracy_meters`, `device_at`, `received_at`.

Relationships: `driver_id` → `driver(id)`; `shift_id` → `driver_shift(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## driver_shift

Owner: Transport workforce. UI: Driver profile/documents/online; operator eligibility/vehicle management.

Enrollment/review/shift APIs missing; verified capability is not user-selected truth.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `driver_id`, `vehicle_id`, `started_at`, `ended_at`, `desired_availability`, `service_area`, `crew_attestation`, `crew_verified_until`.

Required state/type reconciliation: `desired_availability`: online / offline.

Relationships: `driver_id` → `driver(id)`; `vehicle_id` → `vehicle(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## emergency_case

Owner: Emergency. UI: Prelogin SOS, dispatcher/clinical triage, approved no-PIN start.

Scoped guest capability/claim and override flows missing; hashes/approver internals restricted.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `booking_id`, `reported_summary`, `opened_at`, `closed_at`.

Relationships: `booking_id` → `ambulance_booking(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## emergency_start_override

Owner: Emergency. UI: Prelogin SOS, dispatcher/clinical triage, approved no-PIN start.

Scoped guest capability/claim and override flows missing; hashes/approver internals restricted.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `trip_id`, `approved_by`, `reason`, `expires_at`, `consumed_at`.

Relationships: `trip_id` → `trip(id)`; `approved_by` → `identity(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## event_delivery

Owner: Infrastructure. UI: No ordinary business UI; restricted operator diagnostics.

Backend-only transaction/event/retry/replay correctness; do not expose payloads or lease fields.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `event_id`, `consumer`, `status`, `attempts`, `available_at`, `lease_until`, `last_error_code`.

Required state/type reconciliation: `status`: pending / leased / done / dead.

Relationships: `event_id` → `domain_event(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## facility

Owner: Tenant / practice membership. UI: Clinic setup, active facility selector, staff invitations/scope management.

Operational membership projection and invitation/revocation commands missing; solo doctor may own clinic.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `organization_id`, `public_code`, `name`, `kind`, `address`, `location`, `timezone`, `active`.

Required state/type reconciliation: `kind`: hospital / clinic.

Relationships: `organization_id` → `organization(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## fare_quote

Owner: Payments. UI: Patient fare/payment/refund, driver collection/history, authorized finance.

Payment is ambulance-only; verified reconciliation missing; raw provider_event backend-only.

Columns (complete baseline): `id`, `created_at`, `booking_id`, `version`, `kind`, `currency`, `base_minor`, `distance_minor`, `waiting_minor`, `other_minor`, `discount_minor`, `tax_minor`, `total_minor`, `pricing_policy_version`, `distance_meters`, `accepted_by`.

Required state/type reconciliation: `kind`: estimate / final.

Relationships: `booking_id` → `ambulance_booking(id)`; `accepted_by` → `identity(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## followup_recommendation

Owner: Clinical. UI: Doctor entry/history, patient records, follow-up booking.

Clinician signed commands and authorized read/download missing; reception limited to operational status.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `consultation_id`, `recommended_by`, `recommended_date`, `timezone`, `reason`, `status`, `booked_appointment_id`.

Required state/type reconciliation: `status`: active / withdrawn / fulfilled.

Relationships: `consultation_id` → `consultation(id)`; `recommended_by` → `identity(id)`; `booked_appointment_id` → `appointment(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## guest_emergency_session

Owner: Emergency. UI: Prelogin SOS, dispatcher/clinical triage, approved no-PIN start.

Scoped guest capability/claim and override flows missing; hashes/approver internals restricted.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `token_hash`, `expires_at`, `verified_contact`, `claimed_identity_id`, `revoked_at`.

Relationships: `claimed_identity_id` → `identity(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## idempotency_record

Owner: Infrastructure. UI: No ordinary business UI; restricted operator diagnostics.

Backend-only transaction/event/retry/replay correctness; do not expose payloads or lease fields.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `principal_scope`, `operation`, `key`, `request_hash`, `resource_type`, `resource_id`, `result_code`, `expires_at`.

## identity

Owner: Identity / patient. UI: Patient profile/family; doctor authorized patient details; portal patient lookup.

Own-profile/dependent/access commands missing; never expose issuer/subject as editable fields.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `issuer`, `subject`, `display_name`, `verified_phone`, `disabled_at`.

## medication_phase

Owner: Prescription. UI: Doctor structured prescription/revision; patient dosage/PDF/reminders/preferences.

Issue/amend/discontinue/read missing; richer timing UI absent; never silently flatten dosage.

Columns (complete baseline): `id`, `created_at`, `prescription_item_id`, `phase_number`, `dose_quantity`, `dose_unit`, `starts_on`, `ends_on`, `frequency_kind`, `interval_minutes`, `anchor_at`, `timezone`, `max_doses_per_day`.

Required state/type reconciliation: `frequency_kind`: daily_times / interval / as_needed.

Relationships: `prescription_item_id` → `prescription_item(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## medication_timing

Owner: Prescription. UI: Doctor structured prescription/revision; patient dosage/PDF/reminders/preferences.

Issue/amend/discontinue/read missing; richer timing UI absent; never silently flatten dosage.

Columns (complete baseline): `id`, `created_at`, `phase_id`, `sequence`, `local_time`, `meal_anchor`, `meal_relation`, `offset_minutes`.

Required state/type reconciliation: `meal_anchor`: breakfast / lunch / dinner / bedtime; `meal_relation`: before / with / after / independent.

Relationships: `phase_id` → `medication_phase(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## member_doctor_scope

Owner: Tenant / practice membership. UI: Clinic setup, active facility selector, staff invitations/scope management.

Operational membership projection and invitation/revocation commands missing; solo doctor may own clinic.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `member_id`, `doctor_facility_id`, `active`.

Relationships: `member_id` → `organization_member(id)`; `doctor_facility_id` → `doctor_facility(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## notification_delivery

Owner: Notifications. UI: Patient medication/follow-up reminders; all-app preferences/inbox/notifications.

Worker/endpoint secret/lease details backend-only; inbox read state and processing missing.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `intent_id`, `endpoint_id`, `status`, `attempts`, `next_attempt_at`, `lease_until`, `provider_message_id`, `last_error_code`.

Required state/type reconciliation: `status`: pending / leased / sent / delivered / failed / cancelled.

Relationships: `intent_id` → `notification_intent(id)`; `endpoint_id` → `notification_endpoint(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## notification_endpoint

Owner: Notifications. UI: Patient medication/follow-up reminders; all-app preferences/inbox/notifications.

Worker/endpoint secret/lease details backend-only; inbox read state and processing missing.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `identity_id`, `channel`, `address_ciphertext`, `address_digest`, `verified_at`, `revoked_at`.

Required state/type reconciliation: `channel`: push / sms / email / in_app.

Relationships: `identity_id` → `identity(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## notification_intent

Owner: Notifications. UI: Patient medication/follow-up reminders; all-app preferences/inbox/notifications.

Worker/endpoint secret/lease details backend-only; inbox read state and processing missing.

Columns (complete baseline): `id`, `created_at`, `recipient_id`, `event_id`, `occurrence_id`, `template_key`, `dedup_key`, `safe_parameters`, `expires_at`.

Relationships: `recipient_id` → `identity(id)`; `event_id` → `domain_event(id)`; `occurrence_id` → `reminder_occurrence(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## notification_preference

Owner: Notifications. UI: Patient medication/follow-up reminders; all-app preferences/inbox/notifications.

Worker/endpoint secret/lease details backend-only; inbox read state and processing missing.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `identity_id`, `channel`, `category`, `enabled`, `quiet_start`, `quiet_end`, `timezone`.

Required state/type reconciliation: `channel`: push / sms / email / in_app; `category`: appointments / medication / followup / trips / marketing.

Relationships: `identity_id` → `identity(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## organization

Owner: Tenant / practice membership. UI: Clinic setup, active facility selector, staff invitations/scope management.

Operational membership projection and invitation/revocation commands missing; solo doctor may own clinic.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `public_code`, `name`, `kind`, `active`.

Required state/type reconciliation: `kind`: care_provider / ambulance_operator / mixed.

## organization_member

Owner: Tenant / practice membership. UI: Clinic setup, active facility selector, staff invitations/scope management.

Operational membership projection and invitation/revocation commands missing; solo doctor may own clinic.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `identity_id`, `organization_id`, `facility_id`, `role`, `active`.

Required state/type reconciliation: `role`: owner / receptionist / facility_admin / dispatcher / organization_admin.

Relationships: `identity_id` → `identity(id)`; `organization_id` → `organization(id)`; `facility_id` → `facility(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## patient

Owner: Identity / patient. UI: Patient profile/family; doctor authorized patient details; portal patient lookup.

Own-profile/dependent/access commands missing; never expose issuer/subject as editable fields.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `public_code`, `full_name`, `birth_date`, `sex_at_birth`, `contact_phone`, `timezone`, `archived_at`.

## patient_access

Owner: Identity / patient. UI: Patient profile/family; doctor authorized patient details; portal patient lookup.

Own-profile/dependent/access commands missing; never expose issuer/subject as editable fields.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `patient_id`, `identity_id`, `relationship`, `verified_at`, `revoked_at`.

Required state/type reconciliation: `relationship`: self / guardian / delegate.

Relationships: `patient_id` → `patient(id)`; `identity_id` → `identity(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## patient_ambulance_pin

Owner: PIN. UI: Patient set/reset PIN; driver enter PIN/locked state; security diagnostics.

Verifier/pepper/attempt details backend-only; user receives safe rate-limit/recovery state.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `patient_id`, `verifier`, `pepper_key_id`, `credential_version`, `failed_attempts`, `locked_until`, `last_changed_at`.

Relationships: `patient_id` → `patient(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## patient_contact

Owner: Identity / patient. UI: Patient profile/family; doctor authorized patient details; portal patient lookup.

Own-profile/dependent/access commands missing; never expose issuer/subject as editable fields.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `patient_id`, `name`, `phone`, `relationship`, `sharing_consent_at`, `active`.

Relationships: `patient_id` → `patient(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## patient_routine

Owner: Prescription. UI: Doctor structured prescription/revision; patient dosage/PDF/reminders/preferences.

Issue/amend/discontinue/read missing; richer timing UI absent; never silently flatten dosage.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `patient_id`, `anchor`, `local_time`, `timezone`.

Required state/type reconciliation: `anchor`: breakfast / lunch / dinner / bedtime.

Relationships: `patient_id` → `patient(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## payment

Owner: Payments. UI: Patient fare/payment/refund, driver collection/history, authorized finance.

Payment is ambulance-only; verified reconciliation missing; raw provider_event backend-only.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `booking_id`, `fare_quote_id`, `method`, `status`, `amount_minor`, `currency`, `provider`, `provider_payment_id`, `reported_by`, `confirmed_by`, `confirmed_at`.

Required state/type reconciliation: `method`: cash / external_direct / gateway; `status`: pending / reported / confirmed / failed / cancelled.

Relationships: `booking_id` → `ambulance_booking(id)`; `fare_quote_id` → `fare_quote(id)`; `reported_by` → `identity(id)`; `confirmed_by` → `identity(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## pin_attempt

Owner: PIN. UI: Patient set/reset PIN; driver enter PIN/locked state; security diagnostics.

Verifier/pepper/attempt details backend-only; user receives safe rate-limit/recovery state.

Columns (complete baseline): `id`, `created_at`, `trip_id`, `driver_id`, `credential_version`, `outcome`, `request_id`.

Required state/type reconciliation: `outcome`: success / invalid / throttled / stale / forbidden.

Relationships: `trip_id` → `trip(id)`; `driver_id` → `driver(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## platform_feedback

Owner: Feedback. UI: Patient completion ratings/feedback; public published aggregate; moderation.

Submission/eligibility/moderation APIs missing; average derived.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `identity_id`, `app`, `category`, `body`, `status`.

Required state/type reconciliation: `app`: patient / doctor / admin / driver; `status`: new / triaged / closed.

Relationships: `identity_id` → `identity(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## practice_service

Owner: Directory. UI: Patient search/card/profile; doctor profile; portal doctor association.

Limited public directory read exists; detail/search/edit/verification contracts missing.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `doctor_facility_id`, `code`, `name`, `fee_minor`, `currency`, `duration_minutes`, `room_label`, `active`.

Relationships: `doctor_facility_id` → `doctor_facility(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## prescription

Owner: Prescription. UI: Doctor structured prescription/revision; patient dosage/PDF/reminders/preferences.

Issue/amend/discontinue/read missing; richer timing UI absent; never silently flatten dosage.

Columns (complete baseline): `id`, `created_at`, `consultation_id`, `public_code`.

Relationships: `consultation_id` → `consultation(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## prescription_item

Owner: Prescription. UI: Doctor structured prescription/revision; patient dosage/PDF/reminders/preferences.

Issue/amend/discontinue/read missing; richer timing UI absent; never silently flatten dosage.

Columns (complete baseline): `id`, `created_at`, `revision_id`, `line_number`, `medicine_name`, `medicine_code_system`, `medicine_code`, `strength`, `form`, `route`, `instructions`.

Relationships: `revision_id` → `prescription_revision(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## prescription_revision

Owner: Prescription. UI: Doctor structured prescription/revision; patient dosage/PDF/reminders/preferences.

Issue/amend/discontinue/read missing; richer timing UI absent; never silently flatten dosage.

Columns (complete baseline): `id`, `created_at`, `prescription_id`, `revision_number`, `supersedes_id`, `signed_by`, `signed_at`, `action`, `reason`.

Required state/type reconciliation: `action`: issue / replace / discontinue.

Relationships: `prescription_id` → `prescription(id)`; `supersedes_id` → `prescription_revision(id)`; `signed_by` → `identity(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## provider_event

Owner: Payments. UI: Patient fare/payment/refund, driver collection/history, authorized finance.

Payment is ambulance-only; verified reconciliation missing; raw provider_event backend-only.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `provider`, `event_id`, `payment_id`, `event_type`, `payload_digest`, `safe_payload`, `processed_at`.

Relationships: `payment_id` → `payment(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## queue_entry

Owner: Queue. UI: Doctor/reception queue control; patient own position.

Ticket/state visible; allocator/order_key/version internal; safe query/subscriptions missing.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `queue_id`, `appointment_id`, `ticket_number`, `state`, `priority`, `order_key`, `called_at`, `hold_reason`.

Required state/type reconciliation: `state`: awaiting_arrival / waiting / called / in_service / held / completed / cancelled / no_show.

Relationships: `queue_id` → `session_queue(id)`; `appointment_id` → `appointment(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## refund

Owner: Payments. UI: Patient fare/payment/refund, driver collection/history, authorized finance.

Payment is ambulance-only; verified reconciliation missing; raw provider_event backend-only.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `payment_id`, `amount_minor`, `reason`, `status`, `provider`, `provider_refund_id`, `requested_by`.

Required state/type reconciliation: `status`: pending / confirmed / failed.

Relationships: `payment_id` → `payment(id)`; `requested_by` → `identity(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## reminder_occurrence

Owner: Notifications. UI: Patient medication/follow-up reminders; all-app preferences/inbox/notifications.

Worker/endpoint secret/lease details backend-only; inbox read state and processing missing.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `schedule_id`, `due_at`, `local_occurrence_key`, `status`, `emitted_at`.

Required state/type reconciliation: `status`: pending / emitted / cancelled / expired.

Relationships: `schedule_id` → `reminder_schedule(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## reminder_schedule

Owner: Notifications. UI: Patient medication/follow-up reminders; all-app preferences/inbox/notifications.

Worker/endpoint secret/lease details backend-only; inbox read state and processing missing.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `patient_id`, `phase_id`, `timing_id`, `followup_id`, `generation`, `timezone`, `resolved_local_time`, `next_due_at`, `status`.

Required state/type reconciliation: `status`: active / paused / superseded / completed.

Relationships: `patient_id` → `patient(id)`; `phase_id` → `medication_phase(id)`; `timing_id` → `medication_timing(id)`; `followup_id` → `followup_recommendation(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## schedule_break

Owner: Scheduling. UI: Doctor practice calendar; portal scheduling; patient slots.

Version/publish/exception APIs and UI missing; doctor_booking_day locking/counters backend-only.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `schedule_rule_id`, `local_start`, `local_end`.

Relationships: `schedule_rule_id` → `schedule_rule(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## schedule_exception

Owner: Scheduling. UI: Doctor practice calendar; portal scheduling; patient slots.

Version/publish/exception APIs and UI missing; doctor_booking_day locking/counters backend-only.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `doctor_id`, `doctor_facility_id`, `starts_at`, `ends_at`, `reason`, `state`.

Required state/type reconciliation: `state`: active / revoked.

Relationships: `doctor_id` → `doctor(id)`; `doctor_facility_id` → `doctor_facility(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## schedule_rule

Owner: Scheduling. UI: Doctor practice calendar; portal scheduling; patient slots.

Version/publish/exception APIs and UI missing; doctor_booking_day locking/counters backend-only.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `doctor_facility_id`, `version`, `family_id`, `effective_from`, `effective_until`, `iso_weekdays`, `local_start`, `local_end`, `window_minutes`, `window_capacity`, `session_capacity`, `auto_confirm_limit`, `timezone`, `state`.

Required state/type reconciliation: `state`: draft / published / retired.

Relationships: `doctor_facility_id` → `doctor_facility(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## session

Owner: Scheduling. UI: Doctor practice calendar; portal scheduling; patient slots.

Version/publish/exception APIs and UI missing; doctor_booking_day locking/counters backend-only.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `doctor_facility_id`, `doctor_id`, `booking_day_id`, `schedule_rule_id`, `starts_at`, `ends_at`, `timezone`, `hard_capacity`, `auto_confirm_limit`, `room_label`, `state`.

Required state/type reconciliation: `state`: published / open / closed / cancelled.

Relationships: `doctor_facility_id` → `doctor_facility(id)`; `doctor_id` → `doctor(id)`; `booking_day_id` → `doctor_booking_day(id)`; `schedule_rule_id` → `schedule_rule(id)`; `doctor_facility_id,doctor_id` → `doctor_facility(id,doctor_id)`; `booking_day_id,doctor_id` → `doctor_booking_day(id,doctor_id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## session_queue

Owner: Queue. UI: Doctor/reception queue control; patient own position.

Ticket/state visible; allocator/order_key/version internal; safe query/subscriptions missing.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `session_id`, `next_ticket`, `queue_version`.

Relationships: `session_id` → `session(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## session_service

Owner: Scheduling. UI: Doctor practice calendar; portal scheduling; patient slots.

Version/publish/exception APIs and UI missing; doctor_booking_day locking/counters backend-only.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `session_id`, `practice_service_id`.

Relationships: `session_id` → `session(id)`; `practice_service_id` → `practice_service(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## specialty

Owner: Directory. UI: Patient search/card/profile; doctor profile; portal doctor association.

Limited public directory read exists; detail/search/edit/verification contracts missing.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `code`, `name`, `active`.

## symptom

Owner: Directory. UI: Patient search/card/profile; doctor profile; portal doctor association.

Limited public directory read exists; detail/search/edit/verification contracts missing.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `code`, `label`, `active`.

## symptom_specialty

Owner: Directory. UI: Patient search/card/profile; doctor profile; portal doctor association.

Limited public directory read exists; detail/search/edit/verification contracts missing.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `symptom_id`, `specialty_id`, `rank`.

Relationships: `symptom_id` → `symptom(id)`; `specialty_id` → `specialty(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## tracking_share

Owner: Location. UI: Driver location permission; patient/operator live tracking and sharing.

Restricted ingest/read/share missing; epoch/sequence/backend retention never ordinary UI fields.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `trip_id`, `token_hash`, `created_by`, `guest_session_id`, `contact_id`, `expires_at`, `revoked_at`.

Relationships: `trip_id` → `trip(id)`; `created_by` → `identity(id)`; `guest_session_id` → `guest_emergency_session(id)`; `contact_id` → `patient_contact(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## triage_observation

Owner: Emergency. UI: Prelogin SOS, dispatcher/clinical triage, approved no-PIN start.

Scoped guest capability/claim and override flows missing; hashes/approver internals restricted.

Columns (complete baseline): `id`, `created_at`, `emergency_case_id`, `recorded_by`, `observed_at`, `severity`, `assessment`, `suggested_facility_id`.

Relationships: `emergency_case_id` → `emergency_case(id)`; `recorded_by` → `identity(id)`; `suggested_facility_id` → `facility(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## trip

Owner: Trip. UI: Driver and patient tracker, destination handoff/completion/history.

Authoritative transition API missing; explicit cancelled/destination states required.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `booking_id`, `assignment_id`, `status`, `arrived_pickup_at`, `started_at`, `arrived_destination_at`, `completed_at`, `start_authorization`, `pin_credential_version`, `distance_meters`.

Required state/type reconciliation: `status`: heading_to_pickup / arrived_at_pickup / in_progress / arrived_at_destination / completed / cancelled; `start_authorization`: patient_pin / emergency_override.

Relationships: `booking_id` → `ambulance_booking(id)`; `assignment_id` → `ambulance_assignment(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## trip_location

Owner: Location. UI: Driver location permission; patient/operator live tracking and sharing.

Restricted ingest/read/share missing; epoch/sequence/backend retention never ordinary UI fields.

Columns (complete baseline): `id`, `created_at`, `trip_id`, `assignment_id`, `stream_epoch`, `sequence`, `received_at`, `device_at`, `position`, `accuracy_meters`, `sample_reason`.

Required state/type reconciliation: `sample_reason`: periodic / pickup / start / destination / complete / deviation.

Relationships: `trip_id` → `trip(id)`; `assignment_id` → `ambulance_assignment(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## vehicle

Owner: Transport workforce. UI: Driver profile/documents/online; operator eligibility/vehicle management.

Enrollment/review/shift APIs missing; verified capability is not user-selected truth.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `organization_id`, `registration_number`, `display_label`, `inspection_expires_on`, `active`.

Relationships: `organization_id` → `organization(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## vehicle_capability

Owner: Transport workforce. UI: Driver profile/documents/online; operator eligibility/vehicle management.

Enrollment/review/shift APIs missing; verified capability is not user-selected truth.

Columns (complete baseline): `id`, `created_at`, `updated_at`, `row_version`, `vehicle_id`, `capability_id`, `verified_at`, `expires_at`.

Relationships: `vehicle_id` → `vehicle(id)`; `capability_id` → `capability(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## vital_observation

Owner: Clinical. UI: Doctor entry/history, patient records, follow-up booking.

Clinician signed commands and authorized read/download missing; reception limited to operational status.

Columns (complete baseline): `id`, `created_at`, `consultation_id`, `code`, `value_numeric`, `unit_code`, `group_id`, `measured_at`, `recorded_by`, `supersedes_id`, `void_reason`.

Relationships: `consultation_id` → `consultation(id)`; `recorded_by` → `identity(id)`; `supersedes_id` → `vital_observation(id)`. Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.

## Confirmed local additions (not deployed)

`bed_type` supplies controlled bed categories; `facility_bed_inventory` holds one reported aggregate per facility/type, total/occupied/maintenance/observed_at/updating actor and version. Available and occupancy are derived. Patient admissions and individual beds are out of scope. Scoped command/read projection and freshness policy remain missing.
