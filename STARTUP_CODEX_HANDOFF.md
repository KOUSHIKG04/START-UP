# Clinzo / Startup — Codex handoff

Updated: 6 October 2026. Workspace: `C:\startup`.

This is a **self-contained continuation brief for another Codex account**. The other account cannot rely on access to the original chats. This file records the decisions that should survive a new session, the current repository landmarks, and what must be verified again. The longer [four-chat archive](STARTUP_FOUR_CHATS_ARCHIVE.md) contains historical user messages and assistant final answers if a specific decision needs tracing. Neither file proves a workflow works end to end.

If the other account uses this same `C:\startup` checkout, it can read both Markdown files directly. If it uses another machine or checkout, copy both files **alongside the repository**. The Markdown files do not transfer Supabase, Figma, Expo/EAS or other account logins, remote permissions, ignored `.env.local` files, or private test credentials; configure those separately when needed. Start the new agent with the prompt at the end of this file, then give it your next task.

## The four source chats

| Chat title in Codex | Main contribution |
| --- | --- |
| Design scalable monorepo structure | Main ongoing implementation and product decisions: shared Supabase backend, auth/onboarding, verification, facility/company portals, doctor discovery/scheduling, clinic and ambulance flows, notifications, current toast work. |
| Inspect My_code Project | Patient app feature architecture and early cross-app structure. Thin Expo Router routes, feature screens outside routes, shared UI/tokens, single Supabase environment per stage. Some older Nest/Express suggestions in this chat were superseded by the Supabase-first decision. |
| Build doctor app screens | Initial Doctor App UI and navigation from Figma: Home, appointments, clinical notes, prescription, online visit/chat, home visit, profile, schedule and Scan QR. Initial local/demo flows were later integrated selectively with the shared backend. Use Lucide icons like the Patient App, not Figma-exported icons. |
| Build ambulance driver app | Initial Driver App UI from Figma: registration/documents/review, offline/online Home, offer, trip, chat, earnings and profile. Original in-memory preview was later connected selectively to real onboarding, verification, dispatch and trip operations. One side discussion was Codex CLI account separation; it is unrelated to Clinzo runtime behavior. |

The common Figma source is `https://www.figma.com/design/JPyiy9pnS8Ywy9SlSyGUqu/START-UP`. The repository's **`main` branch is the UI/UX source of truth** when preserving or restoring existing screens. Figma and old UI are design references, not authorities for backend security or deployed database state. The user repeatedly asked to keep existing layout, fields, cards, navigation, styling and copy while connecting real data. Do not replace a screen with a simpler operations screen or hardcode data merely because a backend field is missing.

## Product and architecture decisions to preserve

- This is a pnpm monorepo with five apps: `apps/patient-mobile`, `apps/doctor-mobile`, `apps/driver-mobile`, `apps/facility-portal` (the former `apps/web`), and `apps/company-admin` (Next.js). Shared packages are `contracts`, `data-access`, `database`, `design-tokens`, `mobile-ui`, and `web-ui`.
- One **Supabase project per environment** serves all apps. Supabase Auth, PostgreSQL/RPC/RLS, Storage, Realtime and Edge Functions are the backend foundation. There is no separate deployed Nest, Express or Bun API server. `supabase/migrations` is the applied migration source; Drizzle in `packages/database` is modeling/generation tooling, not a second migration runner. Use `packages/contracts` for shared validation/types and `packages/data-access` for reusable client-safe operations. Keep platform-specific session clients app-local.
- Mobile apps use Expo Router with thin route files and feature modules. Shared design values live in `packages/design-tokens`; reusable mobile controls live in `packages/mobile-ui`. Shared web UI uses shadcn/Tailwind and design-token colors. Preserve the established UI across all apps.
- Phone OTP is intended for patient/doctor/driver sign-in. The **email/password path is a disposable-project development mechanism**, because the SMS provider is not configured. Facility portal and Company Admin use email/password. Never put a Supabase secret/service-role key in Expo or browser environment variables.
- The patient's random, persistent **four-digit service PIN is separate from sign-in OTP**. It is visible only to the patient during an applicable active service, stored/verified securely, and required to complete an ambulance trip or doctor home visit. It is not required to start the trip, and a doctor or driver must never receive it through a read API.
- A solo doctor can own a clinic without staff or beds. A multi-doctor clinic is a registered facility. A doctor's association with an existing hospital/clinic needs company credential review **and** facility acceptance; company-approved doctors may enter Doctor Home while their hospital practice remains blocked. Facility registration requires a registration certificate and operating licence; the owner waits for company approval before accessing the dashboard. Bed capability is optional, and the MVP tracks aggregate counts by existing bed categories.
- Doctor discovery should surface verified, eligible doctors for symptoms/specialties without forcing a name search. A doctor with multiple published services must appear only once per practice and visit type in results. Doctor schedule, About, languages and practice location should flow from Doctor App through backend to Patient App. Distance is calculated from patient location to the effective practice/facility location, never stored as a fixed doctor distance. Display full language names and `₹`, not codes or `INR`.
- The doctor controls clinic, online and home-visit schedules separately. Slot duration and limits are service-specific; home visits should not inherit a 15-minute clinic slot. A daily published-slot limit must disable additional selectable pills before Publish. `24:00` is valid only as an end-of-day end time. Date presentation requested by the user is `DD-MM-YYYY` across apps.
- Doctor Scan QR or manual patient-ID lookup is allowed only for a patient with an existing accessible appointment. Driver/vehicle and doctor credentials require manual company review; app users cannot self-approve. Hospital doctor addition is an invitation/association accepted by the other side, not a timer-based success message.
- The user chose Google Maps for Android tracking and Google backend geocoding for home-visit radius validation, and LiveKit for real-time video, but external credentials/configuration may still be missing. Treat these as provider choices, not proof of complete deployment.

## Repository landmarks and evidence

| Path | What to inspect |
| --- | --- |
| `PROJECT_CONTEXT.md` | Cross-app decisions and an older status snapshot. Last reconciled **30 September**; verify every status claim against October code/migrations. |
| `plans/backend-architecture-audit-2026-09-30.md` | USE NOW / LATER / REMOVE audit and migration-boundary analysis. It is an older audit, not an instruction to refactor everything. |
| `plans/main-ui-parity.md`, `plans/ui-db-validation/` | UI-to-database mapping and original UI parity ledger. |
| `plans/mobile-backend-integration.md` | Earlier disposable testing guide; check for drift. |
| `supabase/migrations/` | Reviewed SQL schema, RPC, policy and workflow migrations. The latest local file observed on this handoff is `20261005154814_appointment_notifications_and_window_booking.sql`. **Local file presence does not prove a remote project has applied it.** |
| `packages/database/tooling/verify-disposable.ps1` | Guarded disposable-project validation. Use exact target and inspect scripts before running. |
| `packages/data-access/src/generated/database.types.ts` | Historically a hand-maintained bootstrap, not reliable evidence of the live schema until regenerated against the chosen target. |
| `supabase/functions/online-video-token/`, `send-notification/` | Code for video token and push delivery; inspect deployed secrets, function deployment and device behavior separately. Older docs that call `send-notification` empty are stale. |
| `apps/*/README.md`, `supabase/README.md` | Useful setup history, but several still describe older demo-only or 30-migration state. Prefer current code and remote migration history. |

Local development currently uses Node 22+, pnpm 12.4.1, Expo development builds for native APIs, and Next.js for the two web apps. The `package.json` scripts include `dev:patient`, `dev:doctor`, `dev:driver`, `dev:facility-portal`, `dev:company-admin`, `typecheck`, `test`, `db:check` and `db:migrate`. **Do not run `db:migrate` merely to inspect:** it targets the linked project. Confirm target identity, review pending SQL, and use the disposable guard for validation.

## Environment and test-data boundaries

- Disposable Supabase project for controlled integration tests: `enjafragbcrrgaclwopd`. The older linked development project is `ilbnouxjyurkmsviwbfd`; they must not be confused. Before any migration, seed, Edge Function deploy, or test, check the exact target and remote migration list. The user's earlier authorization covered **validation only on the disposable project**.
- Fifteen disposable Auth/role fixture accounts (five patients, five doctors, five drivers) and a facility test account were created earlier. Their passwords are in ignored `supabase/.temp/disposable-test-accounts.json`; **never copy credentials or API secrets into this handoff or commit them**. The user later wanted fresh manually created data, so check whether those fixtures still exist before depending on them. Auth rows alone do not imply verified doctor practice, approved driver vehicle, slots, or review cases.
- A Company Admin reviewer is manually granted a role after creating a verified Auth user; the user discussed `clinzoadmin@example.com`. Never infer reviewer permission from email alone. Check `clinzo.company_reviewer` and the current role-gate implementation before testing.
- Phone/SMS delivery, external provider secrets, real-device background location, Google maps/geocoding, LiveKit two-device calls, push delivery, EAS builds and cross-app journeys must each be verified independently. A TypeScript pass does not prove native or deployed behavior.

## Recent main-chat work and current checkout state

The main chat progressed well beyond the initial architecture/Figma-only builds. The patient, doctor, driver, facility and company-admin apps now have substantial Supabase-backed onboarding/review/booking work. Recent migration files cover multimode doctor schedules, selected slots, daily slot usage, symptom/specialty discovery, service-specific slot duration, `24:00` end times, and appointment notification/window booking behavior. The last committed revision observed was `8afdc1c feat: update appointment flow`; confirm it again before editing.

The latest change is a **shared mobile toast primitive** at `packages/mobile-ui/src/primitives/Toast.tsx`, with providers in all three mobile root layouts and toast feedback on common actions, especially Doctor Manage Schedule. Success/info toasts last 10 seconds; errors last 15 seconds; tapping dismisses. Duplicate inline action messages were removed where the toast is connected. Foreground push is presented as an in-app toast rather than a native banner; background push remains separate. The previous turn reported package/app typechecks and applicable tests passing, but no device visual verification. On 6 October this toast work is still **uncommitted**: `git status --short` showed modified Patient/Doctor/Driver screen and notification files plus an untracked `Toast.tsx`. Preserve and review these changes; do not reset them inadvertently.

The latest completed backend correction in chat: auto-confirmed appointments should create a **confirmed** notification only; pending bookings create a **requested** notification for doctor acceptance after the auto-confirm limit. Booking different slots in the same schedule session should work, while duplicate booking of the same slot stays blocked. That correction was reported applied/tested on the disposable project; verify again with two accounts/devices, because end-to-end delivery was not observed here.

## Current handoff priorities for a new agent

1. Start with `git status --short`, the last commit, and the exact user request in the new session. Keep the uncommitted toast work. Do not undertake a broad refactor unless requested.
2. Read `PROJECT_CONTEXT.md`, then compare its 30 September status with current `supabase/migrations`, app code, and the disposable project's actual migration list. Resolve documentation drift before making claims of completion.
3. Reproduce any reported issue in the existing UI and trace `UI → contract → data-access/API → RPC/business rule → database → response/notification → other app UI`. Keep `main` UI parity. Do not delete a field to work around missing backend data; add narrowly justified support instead.
4. For Doctor schedule and Patient booking tests, use future dates and distinguish clinic/online/home limits and slots. Test one auto-confirmed and one pending appointment, doctor acceptance, and both apps' notification/state changes. Test with distinct authenticated patient/doctor accounts on the **disposable** project.
5. Test facility registration, company document/case approval, doctor-to-facility request/acceptance, verified doctor discovery by symptom, clinic booking/check-in/consultation, and reviewed driver dispatch/PIN completion as separate controlled journeys. Do not mark video, home visit, push, background tracking or maps complete solely because screens or code exist.
6. Run focused typechecks/tests for touched packages and apps; then a development-build device check for navigation, native modules, permission prompts, push foreground/background behavior and cross-app refresh. For database changes, use a new migration, exact disposable validation and appropriate smoke/RLS checks before any promotion.

## Copy into a new Codex chat

> Work in `C:\startup`. Read `STARTUP_CODEX_HANDOFF.md` first; consult `STARTUP_FOUR_CHATS_ARCHIVE.md` only when more historical detail is needed. You cannot access the old Codex account's chats, so use these files and the repository as context. Inspect `git status`, current code, migrations and the exact Supabase target before acting. Preserve the repository `main` UI and all uncommitted changes. Continue with my next specific request; do not refactor or deploy to the linked/production project without that request.

