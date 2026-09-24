# Clinzo project context

Last reconciled: 24 September 2026. Source of current cross-validation:
[UI ↔ database review](plans/ui-db-validation/README.md).

## Decisions that must not drift

- One Supabase backend per environment serves patient, doctor, driver and web apps.
- Supabase Auth/RPC/RLS/Realtime/Storage/Edge Functions; no separate Bun API server.
- Drizzle models in packages/database are server-only. Supabase CLI alone applies migrations. packages/data-access holds client-safe Supabase adapters; packages/contracts defines shared domain/API types.
- Apps use feature-based modules and the shared design system. React state is UI state, not authority for clinical/dispatch/payment records.
- Doctor ↔ facility is N:M. One identity can be patient, doctor and clinic owner. A solo doctor does not require staff, hospital beds or an extra identity.
- Hospital/clinic web portal first; platform-wide admin console later. Tenant ownership does not imply global administrative privileges.
- Aggregate bed counts first (facility + bed type), not individual admissions/bed assignments. Available = total − occupied − maintenance. Bed types are not medical departments.
- Both independent and operator-invited drivers. Joining an existing operator requires an authorized invitation; do not accept arbitrary organization IDs from signup.
- Figma mobile flows use phone OTP. Do not replace them with email/password just because email is easier to configure. The hospital/clinic web portal uses email/password; the SMS provider remains open.
- Phone OTP is for sign-in and sign-up. A separate random, persistent four-digit PIN belongs to the patient and verifies completion of an ambulance trip or home visit. It is displayed only to the patient during the active service; a driver can start a trip without it. The PIN is not a login credential or ordinary clinic check-in code. Because four digits have only 10,000 possibilities, verification must be scoped to the specific patient and service with throttling; global uniqueness cannot be promised at scale.
- Doctor and driver credentials are reviewed manually. A separate company reviewer app is planned later. Pending accounts cannot self-verify.

## Actual implementation status

The linked development project (`ilbnouxjyurkmsviwbfd`) has only the three user-applied baseline migrations: `initial_models`, `model_guards`, and `public_directory`. Do not treat code in this repository as deployed there. The separate disposable project (`enjafragbcrrgaclwopd`) has all 30 migrations through `20260924112821_patient_sos_booking.sql`. The guarded verification script refuses to target the linked project. Its clinic, inventory, and ambulance/SOS rollback smoke fixtures passed after applying the 30th migration. Local typechecks passed for the new ambulance and SOS app/data-access code. No real-device multi-account journey has been verified.

The three mobile apps have phone OTP, secure device session storage, scoped onboarding, and role gates. The SMS provider is not configured, so real phone sign-in is blocked. The web portal has email/password, SSR cookie handling, route protection, scoped appointment actions and aggregate bed inventory. A verified portal Auth user with an active facility membership has not been provisioned. The web public environment currently points to the disposable project; confirm environment targeting before any real-user test.

Patient and doctor clinic flows use live RPCs for doctor discovery/profile, scoped slot booking, appointment review, QR check-in, queue, consultation, signed clinical records, prescriptions and doctor unavailability. The doctor app can update its own profile. Bounded polling refreshes clinic status; notifications and Realtime subscriptions are not wired. Several older home, appointment and clinical screens still show demo data. No device-level cross-app clinic journey has passed.

The patient app's active ambulance route now requests BLS/ALS/NICU service to a chosen hospital, lists requests, permits pre-assignment cancellation, shows assigned trip status and active-trip patient PIN, and polls a scoped driver position. The driver app registers a vehicle for company review, shows offers, goes Available only after credential/vehicle/capability approval, accepts offers, updates trip stages and completes a trip only after verifying the patient PIN. It reports foreground location while online. The disposable database enforces dispatch matching, scoped trip transitions, location freshness, PIN retry lockout and sampled trip history. Its rolled-back smoke fixture exercised booking through PIN completion and authenticated SOS creation. Company reviewers do not yet have a UI; their trusted review procedure is not callable by app users. Background location, push delivery, automatic retry scheduling and a map/ETA are not implemented.

The persistent patient PIN is generated on profile creation, with legacy backfill, encrypted retrieval through Supabase Vault, a separate salted/peppered verifier, patient-only display during an active trip, throttled completion verification and trusted regeneration. Four digits are not globally unique. It is not used to start the trip. Home-visit PIN completion remains unimplemented. Guest SOS has no patient PIN/identity-claim completion flow yet.

Authenticated patient SOS now has an RPC applied on the disposable project and an app screen with location, emergency details, a long-press request and `tel:112` fallback. Its rollback SQL smoke passed; **in-app SOS dispatch is not ready for real users** because real-device and operational review are still missing and the linked development project has no SOS migration. The request UI is disabled by default through `EXPO_PUBLIC_ENABLE_SOS_DISPATCH=false`. It may be enabled in a disposable test build for controlled device verification; keep it disabled in any real-user build until target-project migration, device and operational review are complete. Pre-login guest SOS and company/emergency escalation have not been implemented.

The earlier guessed onboarding draft remains quarantined under `plans/ui-db-validation/drafts` and is not in the migration path. Supabase CLI migrations are the deployable schema source; Drizzle in `packages/database` is server-only modeling. The generated database type file in `packages/data-access` is a hand-maintained bootstrap and still needs generation from the target schema.

## Required gaps before product readiness

Provision SMS and portal accounts; deploy reviewed migrations to the intended environment; complete cross-app device tests; build guest SOS and its safe handoff/completion policy; background driver location and notification delivery; automatic dispatch retry/escalation; maps/ETA; company review console and document evidence; invitation/review operations; home-visit booking and PIN completion; prescription replacement/discontinuation; clinical document access; payments, refunds and earnings semantics. Aggregate inventory has no public availability freshness policy. Avoid turning demo screens into apparent live operations.

No workflow is yet classified as fully aligned across UI → API → business logic → database → event → another app. The review documents missing edges rather than treating Figma/static screens as delivered behavior.

## Open decisions

SMS provider/test setup; hospital Auth enrollment and recovery; document retention and review rules; home-visit challenge/tracking policy; messaging/video/maps providers and retention; appointment billing/refunds; driver/doctor gross-versus-collected-versus-net earnings; doctor In/Out semantics; walk-in/online capacity allocation; blood-group provenance; facility/ambulance staging relationship; emergency reassignment and handover policy. Company reviewers approve driver credentials, vehicle equipment and required crew, but their identity/scope model and UI belong to the future reviewer app. Never invent these silently.

## Evidence hierarchy and next work

Explicit user decisions above override older documents. Current code shows what exists; Figma shows intended UI, not production rules or deployed APIs. Older docs/architecture specifications remain useful domain references but contain stale 80-table/staff terminology and unimplemented requirements. The cross-validation report and this file record those differences.

Next: review and promote the full post-baseline migration set separately to the intended development project. Configure SMS, provision an authorized verified-email portal member, and run real-device OTP/onboarding, clinic, ambulance and SOS journeys with separate patient/doctor/driver accounts. Keep SOS dispatch disabled until device and operational review pass. Keep applied migrations immutable. The historical clinic slice is documented in [plans/backend-clinic-first.md](plans/backend-clinic-first.md).
