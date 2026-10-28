# Doctor mobile architecture

Home-visit appointment details display the server's booked address, instructions
and optional receiver contact. This snapshot is shared with Patient and Facility
views; saved-address edits do not redirect an existing visit. Payment reservations
retain the same awaiting-payment rules as video/clinic bookings.

## Manual refresh

Home, appointments/details, profile, practice selection and notifications support
pull-to-refresh through their existing feature queries. `DoctorScreen` accepts an
optional refresh callback; screens without that callback retain their existing
behavior. Filters and appointment action drafts are preserved. Schedule editors,
clinical forms, maps and active calls do not acquire refresh gestures. Shared
`mobile-ui` owns refresh presentation and request completion; native gesture
verification remains pending.

Follow the repository [ownership map](../../ARCHITECTURE.md) and
[working rules](../../AGENTS.md). Folder structure should reflect implemented code.

## Current ownership

Booking projections distinguish payment reservations with
`confirmation_payment_pending`. Appointment details and online consultation
screens show the shared awaiting-payment state; these are not requests the doctor
can approve. Home request counts exclude payment reservations. Existing manual
approval continues to allow payment after acceptance, and online start errors
identify the patient-payment requirement.

- `src/app`: Expo Router layouts, auth/verification routing, route adapters, and tabs.
- `features/auth`: login, OTP, onboarding, and verification UI.
- `features/practices`, `features/schedule`: practice selection, working hours,
  services, booking limits, and unavailable time.
  `schedule/hooks/useScheduleEditor.ts` owns the editor coordination; the numeric
  control lives in `components/NumberSetting.tsx`, and setup defaults in
  `utils/scheduleDefaults.ts`.
- `features/appointments`, `features/home`: appointment lists, request review,
  appointment details, and home composition.
  `appointments/hooks/useAppointmentReview.ts` owns request expiry, transitions,
  version refresh, and cache invalidation for the detail screen.
- `features/patients`, `features/consultations`: patient lookup/QR check-in and
  clinic, online, or home consultation screens.
- `features/clinic`: `ConsultationForm` loads the draft and retains the keyed wizard
  boundary. `hooks/useConsultationForm.ts` owns its existing state and mutations;
  `VitalsStep`, `PrescriptionStep`, and `FollowupStep` render each section. Their
  display maps and local types live in the feature's `utils` and `types` modules.
  Consultation screens reuse this owner rather than implementing another form.
- `features/profile`, `features/locations`: doctor/practice profile and address UI.
- `features/notifications`: device notification registration and interactions.
  Its `components/NotificationDrawer.tsx` composes the shared `mobile-ui` drawer;
  `hooks/useNotificationDrawer.ts` keeps notification queries, mutations, cache
  updates, Doctor copy and appointment detail navigation. Adapter props live in
  feature `types/notifications.ts`; the time formatter comes from contracts.
- `src/components`: shared doctor app UI; generic primitives come from `mobile-ui`.
- `src/services`, `src/providers`, `src/stores`: existing session/client, live
  updates, query provider, and UI/draft state.

## Integration and compatibility

Neutral cards and panels use `surfaces.card` from `@startup/design-tokens`: a
0.4 light gray border combined with `shadows.card`. The Profile actions match
Patient's 64px rows, 36px themed icon circles and 14px semibold labels. Keep
inputs and semantic selected/error boundaries with their own controls.

Authentication, verification routing, clinic booking/scheduling adapters, and
clinical operations exist. This app is no longer an unauthenticated screen scaffold.
The mobile client/session lives in `services/supabase.ts`; domain contracts and
reusable operations live in the shared packages. Some legacy/demo paths remain;
inspect the active caller rather than assuming every screen uses backend records.
Deployment and device verification must be checked independently of source files.

Preserve route URLs, parameters, hidden/tab route membership, back behavior, query
keys, subscriptions, appointment versions, and mutation inputs during refactors.
Shared appointment and clinical rules belong in the existing `clinic`/`clinical`
modules, not duplicated in screen-specific service files.

Feature components, hooks, types, constants, and pure helpers stay with their
feature. Create subfolders only when they contain implementation. Empty
location/notification service stubs, unused scaffold directories, `.gitkeep`
markers, and the abandoned `(app)/clinic` directory have been removed after a
reference check. Public route adapters and the existing shared package APIs remain
the integration boundaries.

## Feature ownership review

See [FEATURE_STRUCTURE.md](FEATURE_STRUCTURE.md) for the file-by-file review and
verification limits. Screens compose feature UI; hooks own workflow coordination,
named contracts live in feature types, and static display lists live in feature
constants. Platform services and navigation draft stores have separate owners.

Appointment, QR, profile, onboarding and consultation controllers live in their
feature hooks. `ConsultationForm` uses `useConsultationDraft` and renders the keyed
`ConsultationWizard`; clinical form state stays in `useConsultationForm`. Online
demo/live components share their original styles and retain the LiveKit setup
boundary. Schedule sections have individual component owners. Notification SDK
setup lives in `notifications/services/deviceNotifications.ts` and subscriptions
in `notifications/hooks/useDeviceNotifications.ts`. Location services and stores
live under `locations/services` and `locations/stores`; preferred-practice
persistence lives under `practices/services`.

## Clinic capacity settings

The existing schedule editor owns editable total clinic capacity, app booking
quota and reception walk-in quota. Their sum must fit within the total; changing
capacity does not recalculate consultation duration. `walkin_daily_limit` remains
the legacy database field for the total, while `clinic_app_daily_limit` and
`clinic_walkin_daily_limit` store the allocations. Shared contracts and schedule
data-access operations carry both fields through versioned saves and publication.
Existing settings retain their previous total as the app quota and start with
zero reception allocation. These settings are also editable in Facility Portal.
Queues retain their existing session boundaries and ordering.

## Clinic consultation navigation

Appointment details display the last eight characters of the booking reference;
API calls and route parameters retain the full identifier. After clinic check-in,
the authorized consulting doctor sees Start consultation without the hold/reject
reason field. Pending request review retains its existing required rejection note.
Starting from Waiting still performs Call, reloads the current row version, then
starts the consultation through the existing transition owner.

The parent tab layout hides its navbar on `clinical-notes` and `prescription`, as
it already does for the scanner and call screens. The consultation wizard keeps
its existing keyboard-aware scroll and bottom safe-area spacing, so its Save and
continue action is not covered by the tab bar. Focused component/navigation tests
cover these conditions; native device rendering remains unverified.

## Signed consultation records and video recovery

The online-call owner handles completed, cancelled and unavailable appointments
without the clinic QR fallback. Completed visits open the existing clinical-notes
route with their appointment/patient/mode parameters. That route and completed
appointment details expose a read-only consultation record: assessment, primary
diagnosis, recorded vitals, current prescription medicines and follow-up.
The existing draft query/RPC also reads signed or amended consultations for the
same verified treating doctor; clinical mutation endpoints still require active
consultations. Completion invalidates both appointment and clinical-record queries.

`20261022084126_consultation_availability_and_signed_records.sql` was deployed on
2026-10-22. Its rollback workflow checks saved contents, denies another identity
and rejects writes after signing. Shared `ConsultationCall` lets a tap on the
floating video return from chat to full-screen video, preserving its separate
drag and camera-flip controls. Native gesture/layout verification remains pending
because no Android device was connected. Vitals and prescription-skip controls
remain unchanged; the current request asked for advice on those controls.

## Multiple daily time blocks

The shared publication RPC was optimized by
`20261027143412_schedule_publication_performance.sql` (deployed 2026-10-27).
Unchanged grids and quota-only edits preserve existing window IDs. Repeated
timezone validation no longer dominates changed-grid generation; the API's
eight-second limit is retained. The same backend fix serves Facility Portal
publication, without changing editor drafts, mutation arguments or invalidation.

The existing per-service schedule editor supports one to eight time blocks on its
selected working days. `ClinicHoursPanel` owns the add/remove/time controls; the
existing editor hook owns the draft and versioned publication. Clinic, online and
home settings carry separate arrays through shared contracts and data access.
Duration suggestions sum the time inside blocks and exclude gaps; editing blocks
or quotas does not automatically change the saved duration.

Home schedules include an editable travel buffer before and after each block
(0–180 minutes). Existing schedules retain their original single block, zero
buffer, prices and quotas after migration. Publishing a gap in clinic hours allows
an online or home block to be published there. Publish the clinic gap first when
replacing a previously continuous clinic schedule.

The backend serializes publication per doctor, checks other modes/practices and
travel reservations, and preserves booked windows, appointment IDs and queues.
Changes that exclude an existing booking or intersect a retained booked session
are rejected; staff must keep that block or choose a later effective date. Queues
remain per clinic session. The migration
`20261022071502_multi_block_service_schedules.sql` was deployed on 2026-10-22;
rollback integration tests verify the mixed calendar and booking protection.
Native Doctor layout and live device booking verification remain separate.

## Appointment attendance and recovery

`features/appointments` owns `AppointmentRecoveryPanel` and
`hooks/useAppointmentRecovery.ts`; appointment details compose the panel and keep
the existing consultation actions. The shared contract view supplies staff labels
and action eligibility. List status clocks update every 30 seconds and the detail
review clock every 15 seconds; neither timer changes stored attendance or completes
a consultation.

Practice managers can record patient no-show after the attendance deadline, record
doctor unavailability with a reason, arrange a replacement, and approve or decline
recovery requests. These require backend `can_manage_practice` authorization.
No-show and doctor unavailability are separate recorded outcomes. Approving an
attendance review resolves that request; attendance still requires its explicit
action. Approving a reschedule revalidates and reserves its target transactionally.
Requested times are not held while awaiting review. Active/signed consultations
cannot be rescheduled, and active online consultations can still be rejoined after
the configured attendance deadline.

`features/schedule/components/AppointmentRecoveryPolicy.tsx` extends the existing
Schedule screen with a separate versioned `set_appointment_recovery_policy` save.
The practice-wide defaults are 15 minutes after the booked end, zero minutes of
self-reschedule notice and one patient move per replacement chain. Their allowed
ranges are 0–180 minutes, 0–10080 minutes and 0–10 moves. Schedule-edit permission
is checked separately from appointment management. A policy save does not publish
new slots; stale edits require loading the latest policy before editing again.

Schedule live events also invalidate appointment details and open reschedule
options, since a Facility Portal policy edit changes attendance deadlines and
reschedule eligibility. Appointment events invalidate open replacement options too.

Shared contracts and clinic operations own validation and calls. Review requests
and decisions explicitly call the existing private `emit_appointment_change` emitter
after updating the appointment version; the existing live-update bridge observes
those invalidations. The feature hook invalidates appointment/slot queries after
successful changes. Replacement bookings preserve source allocation and history,
retain confirmed versus unaccepted state, and receive fresh clinic arrival state.
Staff-arranged and doctor-unavailable moves preserve the patient's move allowance.

The recovery migration was deployed to the linked backend on 2026-10-24 with
explicit approval. Post-deployment rollback-only workflow checks passed, and the
security advisor reported no error-level findings. Native layout, keyboard,
consultation rejoin and cross-device recovery
have not been verified on a device. Consultation billing has a separate local
implementation and deployment boundary below.

## Consultation payment management

Appointment Details composes `features/appointments/components/AppointmentPaymentPanel.tsx`.
It reads authorized billing through shared contracts/data-access, displays fee,
capture, refund and balance state, and owns note/action state. Financial permission
requires practice management and schedule-edit permission in the backend; queue
access alone cannot approve financial actions.

Authorized staff can record clinic cash actually received, approve/decline a
versioned refund request, process/reconcile gateway jobs and separately confirm cash
physically returned. Pending online orders must reconcile before cash collection.
Refund approval reserves money and differs from verified provider return. Payment
state is independent of attendance and consultation status. Existing private live
events and mutation invalidations refresh `appointment-billing` across clients.

This is an extension of existing Doctor panels, theme and controls. Checkout stays
in the Patient native app; no provider keys are stored in Doctor client settings.
Payment migrations/functions are deployed and consultation billing is enabled for
test mode with zero deduction. Read-only provider and endpoint probes passed;
actual captures/refunds, native layout and cross-device financial updates
remain unverified. See the [setup guide](../../APPOINTMENT_RECOVERY_PAYMENTS.md).

Doctor focused checks passed 10/10 and final typecheck passed. Billing SQL checks
passed with transient schema/fixtures rolled back, including capture, replacement,
refund and cash authorization/idempotency. Real
provider/native payment operations remain unverified. Hosted deployment has since
completed as described above.

## Consultation commission and payouts

The existing `AppointmentPaymentPanel` also reads `list_payout_entries` through the
shared `clinic/payouts.ts` data-access owner. It shows the authorized appointment's
captured amount, company commission, provider share, selected recipient and payout
status using existing Doctor cards and controls. Backend access retains both
practice-management and schedule-edit permission. Doctor does not configure
company rates, legal payees, bank details or provider secrets.

Company finance owns fee settings and Dashboard-assisted onboarding of the doctor
or facility that the business agreement names as payee. Each captured receipt
freezes its recipient/rate. Payout requires completed care and the editable company
release delay; no advance payout or settlement date is implied. Cash collection
creates a company commission receivable and requires finance's separate receipt
confirmation; it does not trigger an automatic split or debit. Appointment refunds
reverse any transferred provider liability before returning patient funds, with
cash return and request approval remaining separate actions.

The marketplace migration and updated functions are deployed, including the
ambulance worker alias fix. Marketplace/Route activation remains disabled/test,
with commission rates unconfigured. Provider/security mocks and rollback SQL checks cover
rules, not actual Route transfers, native layout or cross-device behavior. See
the [payment guide](../../APPOINTMENT_RECOVERY_PAYMENTS.md) for setup and limits.
