# Doctor mobile architecture

Follow the repository [ownership map](../../ARCHITECTURE.md) and
[working rules](../../AGENTS.md). Folder structure should reflect implemented code.

## Current ownership

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
