# API and action contracts

Status legend: **deployed** = reported applied in Supabase; **proposed** = required contract, not a working endpoint. Every proposed command needs runtime input validation, authenticated actor resolution, resource authorization, concurrency/idempotency behavior, transactional mutation and a safe response.

## Existing API

`public.list_public_practices(p_limit default 20)` is deployed. It returns doctor_code/name, facility_code/name, service_code/name, fee_minor string and currency. It is bounded 1–50, uses an explicit public projection and excludes unverified/inactive practices. It does not provide stable UUID relationships, specialty/languages/photo/qualifications, filters, cursor, availability, queue or user onboarding. `packages/data-access/src/doctors/queries.ts` wraps it; no screen is integrated.

`list_my_inventory_facilities`, `list_facility_bed_inventory` and `update_facility_bed_inventory` now exist in a local migration and passed scoped rollback tests on a disposable project. They remain pending on the linked development project. Available is derived; observation time is set by the database; the update requires the expected row version and emits audit/event records. No public inventory projection or live portal connection is claimed.

## Proposed read contracts

| Contract               | Input and authorized projection                                                                                              | Owner / consumers                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| get_my_context         | Auth user → identity, own patient/doctor/driver profiles, active scoped memberships                                          | Auth/identity → all apps                                          |
| search_practices       | symptom/specialty/mode/facility/origin, bounded cursor; public approved profile/services, derived rating/distance/experience | Directory → patient, authorized portal lookup                     |
| list_practice_windows  | practice/service/date/timezone, server capacity/open state; no patient identities                                            | Scheduling → patient/reception                                    |
| get/list_appointments  | actor+patient/practice scope, IDs, mode/intake, snapshots, lifecycle and allowed actions                                     | Appointments → patient/doctor/reception                           |
| get_my_queue_position  | booking capability/identity; own ticket, people ahead, safe ETA, state                                                       | Queue → patient; staff separate detailed view                     |
| get_patient_record     | explicit patient-access or treating-clinician grant; revisioned clinical DTO                                                 | Clinical → patient/doctor, never unrestricted receptionist        |
| get_trip               | active participant/capability; minimized contact, state, assignment, permitted tracking, fare                                | Transport → patient/driver/dispatcher                             |
| get_facility_inventory | authorized staff read; separate public aggregate projection including observed_at                                            | Facilities → portal/patient/dispatch                              |
| list_notifications     | verified recipient, cursor, read state                                                                                       | Notifications → all apps; inbox model/read receipts need addition |

All sensitive reads must recheck current membership/disabled/revoked status. A trusted JWT proves identity, not permission to a guessed facility or patient UUID. RPCs take no user-supplied actor ID. Clients use decimal strings for money/bigint versions, ISO dates/timestamps and explicit timezone identifiers.

## Proposed mutation contracts and propagation

| Action                              | Permission and invariant                                                                   | Mutation / event                                                          | Affected apps                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | --------------------------------------------- |
| onboarding                          | Confirmed Auth; own profile only; pending clinician/driver; invited organization join      | identity/profile/evidence; review/invitation event                        | Same identity across four clients             |
| invite/accept/revoke membership     | Authorized tenant admin; one-use recipient-bound expiring invitation; allowed role/scope   | invitation + organization_member/member_doctor_scope, audit               | Portal/doctor/driver; session context refresh |
| publish schedule                    | Own doctor/scoped manager; timezone/overlap/capacity/booked-session rules                  | rules/sessions/windows/services and availability event                    | Patient directory, doctor, portal             |
| reserve appointment                 | Authorized patient, compatible window/service, no duplicate, server fee and capacity       | appointment/idempotency/outbox; doctor-day threshold is not hard capacity | Patient, doctor, reception                    |
| accept/reject/cancel                | Own patient cancellation or scoped manager; expected version/allowed transition            | status/reason/capacity release/token revoke/event                         | All appointment participants                  |
| propose/accept reschedule           | Authorized proposer/participant; expire proposal and hold capacity explicitly              | Proposal relationship missing; replacement booking preserves history      | Patient, doctor, reception                    |
| scan/check in/walk in               | Valid confirmed appointment, same practice, token single-use OR audited manual reason      | attendance and ticket atomically                                          | Doctor/reception, patient own queue           |
| call/hold/reorder/no-show           | Authorized operational practice manager; queue consistency                                 | queue version/state/outbox                                                | Staff detail, patient own position            |
| start/complete consultation         | Treating verified clinician; valid arrival/mode; legal lifecycle                           | consultation+queue+appointment transaction                                | Patient record and staff operational status   |
| sign/amend/discontinue prescription | Treating clinician; structured dose, route, timing and revision preconditions              | immutable revision/items/phases, reminders, event                         | Patient/doctor; minimal notifications         |
| submit review                       | Completed appointment/trip, participant, at most one                                       | pending moderation review, published aggregates later                     | Author and public only when published         |
| update bed counts                   | Facility operations membership; expected version; total≥occupied+maintenance               | inventory+audit+event; available derived                                  | Portal and public reported availability       |
| submit/review credentials           | Own subject uploads; assigned reviewer approves; scanner clean                             | evidence and review history; authoritative status                         | Doctor/driver/operator/reviewer               |
| start shift/go online               | Own verified driver, active vehicle/operator, valid license/inspection/crew                | active shift and availability; one active vehicle/driver                  | Dispatch/driver                               |
| request ambulance/SOS               | Patient access or narrow guest capability; location/capability validation                  | booking/emergency/round/offers                                            | Patient/driver/dispatcher                     |
| accept/reject/expire offer          | Own active eligible shift; server expiry; unique booking/driver/vehicle assignment         | offer+assignment+trip transaction, withdraw other offers                  | Patient/winning and losing drivers/operator   |
| arrive/start/complete trip          | Assigned driver; valid state; rate-limited PIN or audited emergency override               | timestamps/state/assignment release/final quote/events                    | Patient/driver/operator                       |
| update location                     | Own active shift+assignment; sequence/epoch, freshness and accuracy                        | latest + sampled trail, safe Realtime payload                             | Authorized tracker/dispatcher                 |
| change destination/cancel/reassign  | Authorized participant or dispatcher, explicit state policy                                | destination history / release / new assignment / reason                   | Both participants, maps, operator             |
| report/confirm payment/refund       | Assigned collector or verified provider signature; quote+currency+amount; idempotent event | payment/provider_event/refund, receipt event                              | Patient/driver/finance scope                  |
| send message/join video             | Active authorized participants, scoped short-lived provider token                          | Conversation/session provider strategy OPEN                               | Patient↔doctor or patient↔driver              |

## State ownership

- Appointment statuses: pending, confirmed, in_consultation, completed, rejected, cancelled, no_show. Patient “approved” is a display label for confirmed, not a new database state.
- Check-in is an attendance record; queued/called/held are queue states; signing/amendment is consultation/prescription state. Do not flatten all into appointment.status.
- Queue: awaiting_arrival, waiting, called, in_service, held, completed, cancelled, no_show. Ticket stays stable; current position is calculated.
- Driver status pending/verified/suspended differs from online/offline, shift active, assignment busy and GPS freshness.
- Offer pending/accepted/rejected/expired/withdrawn differs from booking awaiting_location/searching/assigned/fulfilled/cancelled/unfulfilled.
- Trip heading_to_pickup/arrived_at_pickup/in_progress/arrived_at_destination/completed/cancelled. Completion is not payment confirmation.
- Notification delivered is not user read. Record user read receipt separately from provider delivery.

## Mandatory error/UI contracts

Every mutation returns either a safe authoritative projection or an actionable typed failure: unauthenticated, forbidden, verification_required, validation_failed, stale_version, capacity_full, offer_expired, already_processed, rate_limited, unavailable. UI disables repeat submission while pending, retains drafts after errors, refetches on stale state, and never converts a failed mutation into local success. Outbox retries must not duplicate user notifications or financial writes.

## Tests required before calling a workflow aligned

Authentication confirmation/session refresh/signout; disabled/revoked account; cross-patient/tenant access; role escalation and metadata tampering; two simultaneous last-slot bookings; two drivers accepting one offer; duplicate QR; PIN replay/lockout; disconnected/reconnected clients; rejected/out-of-order provider callbacks; stale inventory writes; single-owner doctor operations; patient cannot complete clinician-owned care; receptionist cannot read unrestricted clinical history; UI renders every permitted terminal state.
