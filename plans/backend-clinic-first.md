# First clinic backend slice

Historical clinic-first slice, recorded 23 September 2026. This document describes the original ten-migration checkpoint and should not be used as the current rollout status. See [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) and [mobile integration](mobile-backend-integration.md) for the later clinic, ambulance and SOS work. The linked development project still has only the three baseline migrations.

## Boundaries

- Sign-up/sign-in: Supabase Auth sends and verifies phone OTP. It creates a session, not a doctor/driver approval.
- Patient completion PIN: a separate random four-digit secret, provided to the patient and checked when completing an ambulance trip or home visit. It is not an Auth OTP. Existing ambulance PIN storage is trip-specific; home-visit completion needs a separately reviewed challenge/attempt design before implementation. Ordinary clinic check-in uses an authorized staff/doctor action and does not consume this PIN.
- Doctor and driver credential documents are reviewed manually. The future company reviewer app will own reviewer UI. Onboarding always creates pending credentials; a trusted database operator can record an externally completed review through clinzo.record_manual_credential_review. No application role has EXECUTE on that function.
- First booking command supports clinic visits only. Online/home fulfilment, patient-to-bed assignment, appointment payment, provider notifications, and public live availability feeds are outside this slice.

## Call chain

1. Each app creates its own Supabase client with project URL/publishable key and platform session storage. Shared data-access receives that configured client; it never holds a global user session or secret key.
2. sendPhoneOtp → verifyPhoneOtp uses Supabase Auth. OTP format/delivery, throttling and SMS provider are configured in Supabase Auth. The code does not generate its own SMS code.
3. getMyProfile returns a phone-verified identity's patient, doctor, driver and scoped membership projections. completeOnboarding links auth.uid() to one identity and creates a patient, pending doctor, solo clinic owner/practice, independent driver operator, or token-invited driver. Client-supplied organization/role IDs are ignored and shared Zod schemas reject them.
4. A trusted operator records a manual credential review after examining external evidence. A pending/suspended doctor cannot publish a bookable clinic session. No self-approval route exists.
5. listMyPractices identifies the caller's authorized practice. publishClinicSession creates a one-off session, service, windows and queue. It does not manufacture a recurring schedule.
6. listClinicSlots exposes verified, future, capacity-available clinic windows. bookClinicAppointment checks patient access, slot/service/practice, schedule exceptions, and capacity under a session lock. It snapshots the current fee, uses a caller-generated idempotency UUID, and records a domain event/audit row in the same transaction.
7. listClinicAppointments gives a patient their own appointments or a practice manager that practice's appointments. Assessment/reason are available only to the verified clinician and authorized patient. transitionClinicAppointment checks actor permission and expected row version for approve, reject, cancel, manual check-in, start and signed assessment completion. Queue, consultation, audit and domain event writes are transactional.
8. Other apps must refetch authorized projections after mutations and on reconnect. No provider notification worker or RLS-safe Realtime subscription is implemented; the event rows are durable backend records, not pushed messages.

## Manual review example

Only an authorized project database operator should call this _after_ an actual external review. Never put a database URL or service credential in an app.

```sql
select clinzo.record_manual_credential_review(
  'doctor',
  '<doctor-id>'::uuid,
  'verified',
  '<reviewer-reference>',
  '<external-evidence-reference>'
);
```

The function writes an immutable audit record. A future reviewer app needs its own scoped server authorization and evidence lifecycle before receiving any permission to perform this operation.

## Verification and rollout gate

- Confirmed: Drizzle model TypeScript, 83-table structural tests, contract TypeScript, Zod validation tests, data-access TypeScript, top-level SQL grammar and PL/pgSQL grammar parses.
- Confirmed by linked dry run: the initial three migrations are applied to the development project and the seven post-baseline files remain pending there.
- Confirmed on a separate disposable Supabase project: all ten migrations applied; a passwordless, rolled-back SQL smoke test exercised Auth identity linking, pending solo-doctor onboarding, manual credential review, session publication, booking replay, cross-patient booking denial, approval, check-in, consultation completion and patient assessment visibility. A separate inventory smoke test checked scoped reads/writes, version conflicts, count invariants, audit and event rows. Fixtures were rolled back.
- Not run: the broader Bun integration suite because the Session pooler rejected the database password (SQLSTATE 28P01). Concurrent last-slot booking, suspended credential behavior, cancellation/queue transitions, tenant isolation beyond the tested path, and cross-client propagation remain unverified.
- Do not run pnpm db:migrate on the linked project until the remaining verification and manual reviewer/SMS configuration are ready. CLI dry-run selects files; the disposable smoke test validates the principal SQL workflow.
