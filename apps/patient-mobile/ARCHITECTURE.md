# Patient mobile architecture

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
