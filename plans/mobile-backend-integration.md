# Mobile backend integration (24 September 2026)

One Supabase project serves the web, patient, doctor and driver apps in each environment. All three Expo apps load public config from their own `.env.local`:

```text
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

Copy each app's `.env.example` to `.env.local` and enter the **same intended development project** URL/key. These values are public client identifiers; never place a database password, service-role key, or secret key in an Expo variable. Restart Expo after changing the files. The web `.env.local` currently points at the disposable verification project, so do not use it as the source for mobile development config.

The patient, doctor and driver app auth screens call the shared Supabase phone OTP adapters. Supabase Phone Auth must be enabled with a working SMS provider before codes can arrive. The code for sign-in is distinct from the persistent four-digit patient trip/home-visit completion PIN. Supabase sessions persist in Expo SecureStore, and profile/role data comes from `get_my_profile`; client-side route guards are only navigation, while the RPCs enforce authorization.

After OTP, patients complete a name-only profile; doctors enter registration credentials or create a solo clinic; independent drivers enter license information and invited drivers also enter their invitation token. Doctor and driver accounts stay pending until manual review. A driver can submit a vehicle for company review but cannot go Available until the driver credential, vehicle equipment and required crew are approved.

Patient Home → **Book a live clinic visit** lists server slots and the user's appointments. A booking sends the selected window/service IDs, patient ID, visit reason and a random idempotency key. Doctor Home → **Manage live clinic sessions** lets a verified doctor choose a practice, publish slots and handle pending/confirmed appointments. Check-in and consultation actions remain subject to database rules, including same-day arrival and a signed assessment on completion. Clinic status uses bounded polling; realtime delivery is future work.

The patient ambulance route requests BLS/ALS/NICU transport and displays driver/trip status and the completion PIN during an active trip. The driver route lists dispatch offers, moves the trip through pickup/start/destination and submits the patient PIN only at completion. Driver location reporting currently works in the foreground and expires from matching when stale. The authenticated patient SOS migration and SQL smoke passed on the disposable project only. `EXPO_PUBLIC_ENABLE_SOS_DISPATCH` defaults to `false`; set it to `true` only in a disposable test build for controlled device verification, and keep it off in any real-user build until the intended target project is migrated and device and operational review pass. The sign-in screen always offers an emergency phone call without requiring OTP. Guest SOS is not implemented.

The linked development project still has only the three baseline migrations. The disposable project has all 30 migrations through `20260924112821_patient_sos_booking.sql`. The hospital web portal also needs a verified email Auth user with an active facility owner/admin/receptionist membership; setting public values alone does not create access. There is no `/hospital` route in the web app: its current portal entry is `/`, and bed inventory is `/bed-management` after sign-in.

Validation available without SMS: `pnpm --filter @startup/data-access typecheck`, `pnpm --filter patient-mobile exec tsc --noEmit`, `pnpm --filter doctor-mobile typecheck`, `pnpm --filter driver-mobile typecheck`, and the package tests. The disposable clinic, inventory and ambulance/SOS rollback smoke fixtures all passed after the 30th migration. Actual OTP delivery, onboarding, and cross-app booking need the provider, promoted migrations and test accounts. Notifications, background tracking, guest SOS, home-visit PIN completion, payments and real-device journeys remain incomplete; do not use preview data as operational records.
