# Patient mobile architecture

## Manual refresh

Home, bookings and appointment details, doctor results/details, records, profile,
ambulance requests/history/payments, and notifications support pull-to-refresh.
Feature owners refresh their existing queries; filters, booking selections and
drafts stay local. Online doctor results reload the first page and replace the
previous accumulated results so removed doctors do not remain in the list.
`mobile-ui` owns the themed indicator, request completion and safe error feedback.
Static screens, editable forms, maps and active calls do not acquire refresh
gestures. Native Android/iOS gesture verification remains pending.

Follow the repository [ownership map](../../ARCHITECTURE.md) and
[working rules](../../AGENTS.md). Create subfolders only for real code.

## Current ownership

| Location                                                           | Responsibility                                                                         |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `src/app`                                                          | Expo Router layouts, session routing, route parameters, and navigation adapters        |
| `features/auth`                                                    | Login, OTP, onboarding, and patient/family profile forms                               |
| `features/home`                                                    | Home composition, search, and home sections                                            |
| `features/doctors`                                                 | Doctor discovery, practice selection, profile display, slots, and booking confirmation |
| `features/appointments`                                            | Appointment lists, booking status, and appointment detail UI                           |
| `features/consultations`                                           | Clinic, home, and online visit UI, completion, and feedback                            |
| `features/ambulance`                                               | Ambulance requests, tracking, payment UI, completion, and SOS                          |
| `features/locations`                                               | Location selection, saved locations, address resolution, and display helpers           |
| `features/notifications`                                           | Device push registration and notification interactions                                 |
| `features/records`, `features/prescriptions`, `features/medicines` | Patient record, prescription, and medicine UI                                          |
| `features/profile`                                                 | Profile, settings, and related dialogs                                                 |
| `packages/mobile-ui`                                               | Reusable mobile presentation components                                                |
| `src/providers`, `src/services`                                    | Existing query provider, mobile session/client, and live-update integration            |

The root layout loads fonts, theme, safe areas, query/toast providers, and session
and notification integrations. Authentication and backend adapters exist; these
are no longer only onboarding or integration scaffolds.

## Data and behavior boundaries

The app uses `services/supabase.ts` for its mobile client/session. Queries and
mutations call `@startup/data-access`; shared validation comes from
`@startup/contracts`. Clinic and clinical operations own appointment and record
data; ambulance modules own transport requests and tracking. UI labels and display
configuration belong to the owning feature, not shared backend operations.

Server records stay in the existing query cache. Form input, selected tabs, modal
state, and other UI drafts stay local or in existing UI stores. Preserve current
query keys, invalidation, realtime cleanup, and booking idempotency during extraction.
Some legacy/demo code remains; inspect the actual caller before claiming a flow is
live. Local source presence does not establish deployment or device verification.

## Structure and navigation

Route groups `(auth)` and `(app)` do not add URL segments. Preserve current paths,
parameters, protected-route behavior, tab membership, and back navigation when
moving feature code. Screen extraction does not authorize route or UX changes.

Within a feature, use `components`, `hooks`, `types`, and `utils` only as needed.
Static options and display mappings follow the existing `utils/*Constants.ts`
convention. Derived values remain with their inputs. Tiny private UI helpers can
stay in the same file; larger units should have an explicit responsibility before
extraction. Generic presentation primitives belong in `packages/mobile-ui`.

`SectionHeader` is imported directly from `@startup/mobile-ui`. The feature's
`features/notifications/components/NotificationDrawer` composes that package's
shared drawer. Its `hooks/useNotificationDrawer` retains notification queries,
mutations, cache updates and Patient copy; its adapter props live in feature
`types/notifications.ts`. The package owns filtering, swipe actions and animations;
`@startup/contracts` provides the shared `notificationTime` utility.

Auth address/profile form types live in `features/auth/types`, address defaults in
`utils/addressConstants.ts`, and the keyboard-scroll calculation in
`utils/keyboardScroll.ts`. App tests belong in the root `tests` directory, including
`notifications.test.cjs` (all three app adapters) and `keyboard-scroll.test.cjs`.

Public Home, Doctor card, appointment card and consultation-flow UI types live in
their feature `types` modules. Existing component type exports remain available
for compatibility. Profile form choices live in `auth/utils/profileFormConstants`;
small private render helpers remain with their components.

Empty `api`/`hooks` folders, `stores/.gitkeep`, and location/notification service
stubs have been removed. The abandoned `(app)/clinic` directory has also been
removed; working route paths and groups are preserved.

## Booking composition

The booking controller loads `get_appointment_booking_options` for the selected
confirmation slot. Auto-accepted prepaid bookings use `prepare_appointment_booking`
and the shared native `services/paymentCheckout.ts` orchestration; **Pay & Book**
confirms only after verified capture. Approval-required bookings remain request,
doctor acceptance, then online payment in Appointment Details. Patient app bookings
always use online payment; reception collection remains a staff walk-in workflow. Missing native checkout is detected before a reservation is
created. The booking dialog owns policy consent; recovery projections
label unpaid reservations without offering consultation/approval actions. Reservation
expiry/cancellation and final confirmation remain backend-owned.

Patient-only online payment was deployed on 2026-10-27 in
`20261027170816_patient_booking_online_payment_only.sql`. Booking options no longer
offer reception, and the canonical patient booking function rejects reception
requests before creating or retrying a booking. Existing reception bookings keep
their history. Staff walk-in registration and cash collection are unchanged.
Rollback checks covered capture-gated clinic/video booking, manual approval,
free visits, rejected reception bypasses, and staff channel capacity/registration.
Native Razorpay and screen transitions still require device verification.

`BookingProgress` covers the Doctor Details page while a booking is being prepared,
Razorpay is opening, payment is being verified/reconciled, and the appointment list
is refreshed before navigation. It uses a native View instead of a second Modal so
the Razorpay activity can appear above it. `paymentCheckout.ts` reports stages to
the existing booking controller; errors and completed navigation clear the cover.
The confirmation dialog closes before the native checkout request starts. Booking
arguments, capture/reconciliation rules and destination routes remain unchanged.
Host tests cover delayed responses and cancellation cleanup; native activity
presentation and transition appearance still require device verification.

Home visits select an existing saved location through `/select-location`. A map
pin, building and city are required. `prepareAppointmentBooking` forwards its ID
to `prepare_home_visit_booking`; the shared backend booking owner checks access
and practice travel-radius coverage before creating the same payment reservation
or approval request. The confirmation shows the visit destination; appointment
details use the server's immutable address/instruction snapshot. Coverage uses the
saved pin, not device fallback coordinates. Native map/checkout verification is pending.

Booking-time headers show the server's remaining daily booking allowance, bounded
by the number of eligible time choices for the selected date. They no longer
present the number of time options as the number of appointments available.
Online retains all eligible time choices; clinic retains its existing discovery
cap. `daily_bookings_remaining` is optional/nullable for compatibility, so older
responses show the time-selection helper without inventing a booking count.
The shared call surface also accepts a tap on its floating video during chat to
restore the full-screen video. Camera, message, room and drag ownership are retained.

`20261022084126_consultation_availability_and_signed_records.sql` was deployed on
2026-10-22. The private remaining-capacity calculation is shared with the existing
admission guard; slot RPC names, choices and booking limits are unchanged. Rollback
SQL verifies choice preservation and allowance changes on reservation/cancellation.
Component tests cover quota copy and both app themes' preview action. Native video
tap/drag and layout verification remains separate.

`FindDoctorScreen` owns the booking guide entry below its search field. The
`BookingGuideLink` component lives in `features/doctors/components`; Home no
longer renders that entry. The guide keeps the current consultation type.

`features/doctors/hooks/useDoctorBooking.ts` owns the existing practice queries,
location fallback, booking mutation, idempotency key, and confirmation state.
`useBookSlots.ts` owns slot/date/patient selection and carousel effects. Both hooks
run once from their existing screen/component boundaries; query keys, cache
invalidation, and loading ownership are retained.

`DoctorProfileScreen` composes profile content and `BookingConfirmationDialog`.
`BookSlots` composes `BookingDateSection`, `BookingTimeSection`, and
`BookingPatientSection`. Their shared styles remain within the doctors feature.
The practice-timezone day formatter is in `utils/bookingDates.ts`; do not replace
it with UTC conversion when refactoring.

Clinic slot discovery caps the returned choices per practice and booking day at
the remaining app allocation and total capacity, using
the earliest eligible times. The cap is applied before the RPC result limit so
later dates remain discoverable. Online and home results retain their behavior;
existing appointments and stored windows are preserved. This backend change is
in `20261021152313_cap_clinic_time_options_by_daily_limit.sql`, deployed to the
linked backend on 2026-10-21. Transaction checks verified 54-to-12 clinic results,
unchanged non-clinic results and compatible results from all three listing RPCs.
`20261021174352_clinic_channel_capacity_and_reception.sql` extends this policy
with editable app and reception quotas within the total clinic capacity; deployment
was verified on 2026-10-21. Existing limits become app allocations; reception starts
at zero until configured. App
reservations cannot consume the reception allocation. The source-aware admission
guard shares the existing booking-day lock with the total-capacity guard.
`supabase/tests/smoke/clinic-channel-capacity.cli-smoke.sql` verifies quota edits,
channel exhaustion, total capacity, reception demographics/idempotency, queue
creation and denied access inside a transaction that is rolled back. The older
daily-capacity fixture still requires a disposable database. Native booking
verification remains separate. Reception-created patients do not automatically
gain app access from a matching phone number.

The focused booking regression checks are in `tests/verified-directory.test.cjs`.
They load extracted local modules and exercise location switching, selected fees,
available slots, and confirmation loading. Device and end-to-end checks remain
necessary when changing those behaviors.

## Clinic-day check-in page

My Bookings and Appointment Details open the existing `/visit-session` route in
`clinic-check-in` mode. The entry appears on the clinic's local appointment day;
arrived patients can reopen their queue. Full backend IDs stay in navigation.
`ClinicVisitFlow` restores the separate Hospital Visit layout from `main`, using
the existing summary, QR surface, facility section and queue illustration.

`consultations/hooks/useClinicCheckIn.ts` owns secure token issuance and expiry,
and observes the existing `patient-clinic-appointments` cache. It refreshes on
focus and polls every 15 seconds while focused, without adding another realtime
subscription. A token expires after five minutes and can be refreshed explicitly.
The “I’ve checked in” button reloads server state; it cannot mark arrival locally.
Only server-confirmed arrival reveals the queue, with the actual ticket and people
ahead. No estimated wait is invented. Completion follows the backend appointment
status through the existing completion destination. These changes require no
backend schema update. Focused QR/expiry/navigation tests pass; native camera,
screen layout and an authenticated cross-device check-in remain unverified.

My Bookings and Appointment Details share the compact `BookingCard`: its body
opens appointment details, while only the avatar and doctor name open the booked
doctor's profile. `tests/appointment-cards.test.cjs` checks these separate press
targets and preserves the practice/service IDs through display mapping. Those
cards use the patient teal gradient with light text and a circular trailing
arrow. Doctor identity and visit type form the first row, with the menu and arrow
at its right. The menu retains a 44px touch target. Date and time share one line
below an edge-to-edge divider on the left, with the status at the right end of the same row.
Metadata wraps when space is limited. Their Inter scale uses 16/24 SemiBold for the
doctor name, 13/18 for specialty, visit type and scheduling, and 12/16 Medium for
status. The card inherits its explicit typography rather than the larger global
trial roles, permits metadata wrapping, and keeps AM/PM attached to its time.
Browser checks cover 320, 390 and 430px previews; native verification is separate.
My Bookings places eligible Join/QR actions, queue information, issued QR codes
and completed-visit ratings in a transparent footer over the same card gradient.
Footer text and button outlines use light colors for contrast. Pending/confirmed
bookings expose cancellation through a three-dot menu using `ModalSurface`.
The screen retains action eligibility, mutation arguments and loading states.
The card summary is its own press target, so footer actions cannot also open
appointment details. Cards without footer content do not render an empty footer.
Appointment ID text in details and the actions menu shows only the final eight
characters; route parameters, stored IDs and mutation inputs retain full IDs.
The booked doctor profile
IDs are added to the existing authorized `list_care_appointments` projection by
`20261021090000_appointment_doctor_profile_links.sql`. This migration was applied
and recorded on the linked backend on 2026-10-21. Older responses still render
and show an unavailable message rather than guessing a doctor. Native navigation
still requires device verification.
The deployment check verified the correct practice/service IDs on eight existing
appointments, preserved prior fields and ordering, and retained authenticated-only
RPC execution. No unrelated pending migrations were applied.

## Complete feature review

The file-by-file ownership map is in [FEATURE_STRUCTURE.md](FEATURE_STRUCTURE.md).
All feature source files were reviewed together with their callers. Screens now
compose feature hooks and UI; they do not import query or backend operation APIs.
Named contracts live in feature `types` modules with kebab-case filenames. Static
choices/maps use flow-named `utils/*Constants` modules; pure functions live in
separate utilities. Compatibility type exports retain existing caller APIs.

Location drafts live in `features/locations/stores`, while permission/geocoding and
address resolution live in `services`. Notification SDK setup, local scheduling
and push-aware sign-out live in notification `services`; device subscriptions live
in `hooks/useDeviceNotifications`. Their existing initialization and cleanup remain
at the same app/component boundaries.

Large booking-status, tracking, completion and profile UI sections have component
owners. Small private render helpers and presentation state can stay local; file
length alone does not require another component or hook. Demo constants are named
explicitly and are not live booking/scheduling sources.

`tests/feature-structure.test.cjs` guards these ownership rules.
`tests/feature-lifecycle.test.cjs` covers notification disposal and OTP timers.
The existing 78 TypeScript errors and 17 legacy map-harness failures are baseline
issues; source checks and mocks do not establish native/device verification.

## Development log capture

The workspace pnpm patch for `expo-router@57.0.24` defers native initial-link
tracking until commit and cancels it on cleanup. It is shared by Patient, Doctor
and Driver; it does not change this app's routes or protected-group decisions.
See [dependency patch notes](../../patches/README.md) and
`tests/expo-router-linking.test.cjs` before upgrading Router. Native startup and
reload verification remain separate from the deterministic hook tests.

`pnpm --filter patient-mobile start:logs` starts the existing Expo development
client server and mirrors terminal stdout/stderr into `.expo/logs/start-*.log`.
Pass the existing Expo options as needed, for example `start:logs --tunnel`.
Terminal logs only contain output delivered to Metro; native-only failures require
device capture. This command does not change application runtime logging.

`pnpm --filter patient-mobile logs:android` mirrors ADB logs to the terminal and
`.expo/logs/android-*.log`, filtered to the installed Patient app's UID. It captures
React Native JavaScript/native logs and other app warnings/errors across process
restarts. The phone must be connected and authorized for USB/wireless debugging.
`--dump` captures existing device history and exits; `--device SERIAL` selects a
device when several are connected. `APP_VARIANT` selects the existing development,
preview or production package; `--package PACKAGE` overrides it for Expo Go or a
specific build. Logs stay in the ignored `.expo` directory.

Doctor schedules may contain multiple clinic blocks separated by online or home
visits. Patient discovery continues using the existing mode-filtered slot APIs;
unavailable visit blocks and home travel reservations are excluded during backend
materialization. The clinic app quota remains a daily maximum across all clinic
blocks and may exceed the number of physical times that fit in a shorter day.
Existing appointments retain their IDs, times and queue sessions. This integration
is deployed in `20261022071502_multi_block_service_schedules.sql` (2026-10-22);
rollback tests confirm the patient-visible clinic times match split availability.

## Appointment attendance and recovery

`features/appointments` owns recovery actions in My Bookings and appointment
details, the `AppointmentRecovery` adapter, and `hooks/useAppointmentRecovery.ts`.
The hook composes validated `@startup/data-access` clinic operations and retains
the appointment/slot cache invalidations and one idempotency key per dialog.
`@startup/contracts` owns `appointmentRecoveryView`; `@startup/mobile-ui` owns the
presentation-only `AppointmentRecoveryDialog`. Existing routes, patient selection
and consultation owners remain the integration points.

The shared view distinguishes expired requests, time passed, checked-in patients
waiting for the doctor, patient no-show, doctor unavailability and replacements.
The list and detail clocks update every 30 seconds without writing attendance.
Clinic review follows the session end; other visits use the booked end plus the
configured grace. Confirmed online visits cannot first join after that deadline;
an active consultation can still be rejoined. Time passing never completes a visit.
Checked-in patients retain visible queue access until staff resolve attendance.

Rescheduling lists future times for the same practice, service and visit mode.
Eligible early changes commit directly; late confirmed changes and patient
no-shows request staff review. Requested times are not held until approval.
Doctor-unavailable recovery does not consume the patient's move allowance.
Replacement links retain the original booking history; a new clinic queue entry
starts awaiting arrival, without copying check-in or QR state. Verified patient
access, including existing family/delegate access, is enforced in the backend;
UI eligibility does not grant access.

Recovery requests/decisions update the appointment version and explicitly invoke
the existing `emit_appointment_change` private emitter. The existing live-update
bridge refreshes `patient-clinic-appointments`; no recovery-table subscription is
added. Failed mutations refresh the booking before retry. Operational defaults are
15 minutes of grace, a zero-minute cutoff and one patient move per replacement
chain; authorized Doctor/Facility schedule editors can change them.

Recovery migration
`20261023075921_appointment_recovery_and_rescheduling.sql` was deployed to the
linked backend on 2026-10-24 with explicit approval. Post-deployment rollback-only
workflow checks passed, and the security advisor reported no error-level findings.
Native recovery dialogs, keyboard behavior,
queue navigation and cross-device updates have not been verified on a device.
Consultation billing now has a local implementation described below; its deployment
and provider verification remain separate from recovery deployment.

## Consultation payments

Payment panels compose the shared `PaymentSummary` presentation components.
Refund requests use `AppDialog` for their amount/deduction preview and reason,
while their existing query, mutation and invalidation ownership stays local.
The Doctor Profile address prompt and ambulance contact/location alerts also
compose `AppDialog`; their actions and routes are unchanged. No app-owned native
`Alert` calls remain. OS permissions, sharing and Razorpay Checkout remain managed
by the OS/provider. Native layout and keyboard behavior still need device checks.

Appointment Details composes `features/appointments/components/AppointmentPayment.tsx`.
It owns the billing query, accepted-policy state, payment/refund actions and cache
invalidation. Shared contracts and `data-access/src/clinic/payments.ts` own validated
RPC/Edge calls. The existing private appointment live-update bridge also invalidates
`appointment-billing`; it adds no public billing subscription.

`src/services/paymentCheckout.ts` owns native Razorpay Checkout through
`react-native-razorpay` 3.0.0. It verifies platform/native-module availability before
requesting a server order, dynamically loads the SDK and uses the Patient primary
color. A new native build is required; web and old builds show an actionable error.
The app receives public checkout values only, never provider secrets.

An undeployed billing RPC (`PGRST202`) omits the payment surface; other failures
retain retry states. Patient reschedule previews show exact top-up or unused credit
from verified `billing.credit_minor`, rather than assuming the replacement fee.

The themed payment card shows fee, captured/refunded amounts, balance, accepted
terms, attempts, refund calculations and provider references. Patient app bookings
use online checkout; staff-registered walk-ins can pay at reception. Verified credit follows replacement bookings; higher
fees need top-up and unused credit can be requested back. Cancellation refunds and
surplus refunds are distinct staff-reviewed requests. Test mode is visibly labeled.
Billing changes retain the current route and existing appointment/recovery owners.

The payment migrations and three functions were deployed on 2026-10-24 with user
approval. Consultation billing is enabled in test mode with zero deduction;
test credentials and signed webhook/server-worker probes passed. Live payments,
Route and marketplace/ambulance collections remain disabled.
Native Checkout and cross-device financial updates remain unverified. Follow the
[payment setup and activation guide](../../APPOINTMENT_RECOVERY_PAYMENTS.md) for
server-only credentials, webhook configuration, rebuilding and test activation.

Billing SQL workflow and recovery compatibility checks passed inside rollback-only
transactions. Provider mocks passed 8/8 and shared clinic/data-access regressions
12/12. Patient typecheck retains the unchanged ambulance-hook `TS18048` baseline
at `useAmbulanceBooking.ts:398`; these checks do not establish native/provider coverage.

## Ambulance payment extension

`features/ambulance/components/AmbulancePayment.tsx` and `hooks/useAmbulancePayment.ts`
own completed-trip billing, native checkout and status refresh. Completion composes
this panel; `ambulance/payments` lists past completed trips and
`ambulance/payment/[id]` reopens one trip's payment. Their route adapters compose
`AmbulancePaymentsScreen`; `useAmbulancePaymentHistory` owns history reads. Existing
ambulance UI, themed controls and navigation retain their owners. Payment never
blocks emergency dispatch or care.

The final fare is set by company finance after trip completion, not calculated
from a new client pricing rule. Patient can review and pay that saved fare; Driver
can confirm cash actually received. Shared marketplace contracts and ambulance
data-access operations own validation and calls. Appointment and ambulance use the
same app-wide native Checkout service; it keeps the native-build/platform guard
and receives no server secrets. Closing Checkout keeps its online order reserved
and blocks cash; no automatic conversion to cash is available. Historical cash
receipts remain readable after billing is disabled.

Ambulance refunds currently reconcile provider Dashboard refunds; self-service
ambulance refund requests are not implemented. Consultation refund/recovery credit
continues through the existing appointment owner. Both payment migrations and
updated functions are deployed, including the follow-up ambulance worker alias fix.
Ambulance/Route activation remains off. Mock and rollback SQL verification does not
establish native Checkout, actual provider captures/refunds or
cross-device behavior. See the [payment guide](../../APPOINTMENT_RECOVERY_PAYMENTS.md)
for setup, Route limits and the verification runner.
