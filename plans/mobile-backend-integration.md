# Mobile backend integration (24 September 2026)

One Supabase project serves the web, patient, doctor and driver apps in each environment. All three Expo apps load public config from their own `.env.local`:

```text
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

Copy each app's `.env.example` to `.env.local` and enter the **same intended development project** URL/key. These values are public client identifiers; never place a database password, service-role key, or secret key in an Expo variable. Restart Expo after changing the files. The web `.env.local` currently points at the disposable verification project, so do not use it as the source for mobile development config.

The patient, doctor and driver app auth screens normally call the shared Supabase phone OTP adapters. Supabase Phone Auth must be enabled with a working SMS provider before codes can arrive. For disposable-project workflow testing before SMS is configured, use the guarded email/password fixture path below. The code for sign-in is distinct from the persistent four-digit patient trip/home-visit completion PIN. Supabase sessions persist in Expo SecureStore, and profile/role data comes from `get_my_profile`; client-side route guards are only navigation, while the RPCs enforce authorization.

## Disposable-project mobile sign-in test

The development-only email/password form is visible only when Expo is running in development mode, `EXPO_PUBLIC_ENABLE_DEV_PASSWORD_LOGIN=true`, and the app URL is exactly `https://enjafragbcrrgaclwopd.supabase.co`. Release builds and other Supabase projects retain the phone OTP form. This does not change Clinzo's database rule requiring a confirmed phone: the fixture command creates a test Auth user with both confirmed email and confirmed phone on the disposable project. The phone confirmation is simulated for testing and must never be used as evidence that the tester owns the number.

1. Confirm the disposable project `enjafragbcrrgaclwopd` has the expected migrations. Keep the linked project `ilbnouxjyurkmsviwbfd` separate. Use only test data and phone numbers you control; leave `EXPO_PUBLIC_ENABLE_SOS_DISPATCH=false`.
2. In each mobile app's ignored `.env.local`, set `EXPO_PUBLIC_SUPABASE_URL=https://enjafragbcrrgaclwopd.supabase.co`, that project's publishable key, and `EXPO_PUBLIC_ENABLE_DEV_PASSWORD_LOGIN=true`. No service-role key belongs in any app or `.env.local`.
3. From PowerShell at `C:\startup`, create three distinct fixture users:

   ```powershell
   $env:TEST_PROJECT_REF = "enjafragbcrrgaclwopd"
   & .\packages\database\tooling\create-disposable-auth-user.ps1 -Kind patient
   & .\packages\database\tooling\create-disposable-auth-user.ps1 -Kind doctor
   & .\packages\database\tooling\create-disposable-auth-user.ps1 -Kind driver
   ```

   The command prompts separately for each email, phone, password, and the disposable project's secret key (`sb_secret_…`; a legacy `service_role` key also works). Find it in **Supabase Dashboard → Project Settings → API Keys** for the disposable project. Do not paste it into a command, source file, app environment variable, or chat. The script refuses the linked primary project and does not print credentials.
4. Restart each Expo server (`pnpm dev:patient`, `pnpm dev:doctor`, `pnpm dev:driver`). Sign in with each fixture's email/password and complete the matching onboarding. The app continues using its regular Supabase session, RLS and RPCs after sign-in.
5. Walk through patient clinic discovery/booking, doctor clinic sessions, and ambulance/driver flows. Doctor credentials and driver/vehicle/crew remain subject to company review; an Auth fixture alone does not approve them. Test those approval transitions only with the authorized manual-review process.

This path verifies application and database behavior but does not verify SMS delivery, real phone ownership, Google OAuth, notifications, or background location. Remove fixture accounts when the disposable project is retired. Disable the flag in `.env.local` to return to the phone OTP form.

After OTP, patients complete a name-only profile; doctors enter registration credentials or create a solo clinic; independent drivers enter license information and invited drivers also enter their invitation token. Doctor and driver accounts stay pending until manual review. A driver can submit a vehicle for company review but cannot go Available until the driver credential, vehicle equipment and required crew are approved.

Patient Home → **Book a live clinic visit** lists server slots and the user's appointments. A booking sends the selected window/service IDs, patient ID, visit reason and a random idempotency key. Doctor Home → **Manage live clinic sessions** lets a verified doctor choose a practice, publish slots and handle pending/confirmed appointments. Check-in and consultation actions remain subject to database rules, including same-day arrival and a signed assessment on completion. Clinic status uses bounded polling; realtime delivery is future work.

The patient ambulance route requests BLS/ALS/NICU transport and displays driver/trip status and the completion PIN during an active trip. The driver route lists dispatch offers, moves the trip through pickup/start/destination and submits the patient PIN only at completion. Driver location reporting currently works in the foreground and expires from matching when stale. The authenticated patient SOS migration and SQL smoke passed on the disposable project only. `EXPO_PUBLIC_ENABLE_SOS_DISPATCH` defaults to `false`; set it to `true` only in a disposable test build for controlled device verification, and keep it off in any real-user build until the intended target project is migrated and device and operational review pass. The sign-in screen always offers an emergency phone call without requiring OTP. Guest SOS is not implemented.

The linked development project still has only the three baseline migrations. The disposable project has all 30 migrations through `20260924112821_patient_sos_booking.sql`. The hospital web portal also needs a verified email Auth user with an active facility owner/admin/receptionist membership; setting public values alone does not create access. There is no `/hospital` route in the web app: its current portal entry is `/`, and bed inventory is `/bed-management` after sign-in.

Validation available without SMS: `pnpm --filter @startup/data-access typecheck`, `pnpm --filter patient-mobile exec tsc --noEmit`, `pnpm --filter doctor-mobile typecheck`, `pnpm --filter driver-mobile typecheck`, and the package tests. The disposable clinic, inventory and ambulance/SOS rollback smoke fixtures all passed after the 30th migration. The guarded fixture path enables onboarding and cross-app workflow testing there; actual OTP delivery still needs an SMS provider. Notifications, background tracking, guest SOS, home-visit PIN completion, payments and real-device journeys remain incomplete; do not use preview data as operational records.
