# Shared Supabase backend

Patient, Doctor, Driver and Web Admin share one Supabase project per environment.
Supabase Auth, PostgreSQL, RPC, RLS, Realtime, Storage and Edge Functions form the
backend. There is no separately deployed Bun API.

| Location                              | Responsibility                                       |
| ------------------------------------- | ---------------------------------------------------- |
| packages/database/src/schema | Server-only Drizzle models                           |
| packages/data-access                  | Shared typed Supabase client and reusable operations |
| supabase/migrations                   | Reviewed SQL: tables, constraints, RPC and policies  |
| supabase/functions                    | Trusted integration handlers deployed to Supabase    |
| supabase/config.toml                  | Local CLI configuration; not hosted credentials      |
| packages/database/tooling/seed.ts     | Explicit synthetic development fixture               |

## Current implementation

The three baseline migrations are on the linked development project. The separate
disposable project has all 30 migrations through
`20260924112821_patient_sos_booking.sql`, and its rollback smoke fixtures pass.
Review the post-baseline migration set for the intended development environment
before pushing it to the linked project.

The private `clinzo` schema has guarded public RPCs for phone onboarding, doctor
discovery, clinic booking/check-in/queue/consultation, scoped inventory, ambulance
booking/dispatch/trips/location, and patient completion PIN. The patient, doctor,
driver and web apps use corresponding shared contracts and data-access adapters;
some older screens still use demo data. The patient app's authenticated SOS RPC
is applied only to the disposable project, and in-app SOS dispatch is disabled by default. Guest
SOS is unimplemented. Realtime delivery, notification handlers, storage policies,
external messaging/maps and payments are not ready. The four named Edge Function
folders are placeholders and remain disabled until implemented. See
[PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) for precise status and open decisions.

## What verification means

- **Phone account:** enable Phone on the hosted project's Auth Providers page and
  configure an SMS provider. `sendPhoneOtp` requests an Auth code;
  `verifyPhoneOtp` returns a session. The backend requires a confirmed phone on
  `auth.users` before onboarding. The separate four-digit patient PIN does not
  sign anyone in.
- **Doctor/driver credentials:** onboarding creates `pending` records. An actual
  human reviews documents outside these apps; only a trusted database operator
  can record that decision with `clinzo.record_manual_credential_review`. The
  future reviewer app needs its own scoped authorization before it can do this.
- **Backend implementation:** local typechecks are preliminary. The disposable
  clinic, inventory and ambulance/SOS rollback smoke fixtures passed through the 30th
  migration. Real-device
  multi-account journeys are not yet verified.

The earlier auth draft is outside the migration folder and must not be deployed.
See [UI/database validation](../plans/ui-db-validation/README.md) and
[PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) for confirmed scope and open decisions.

## Create and connect a hosted development project (no local Docker required)

1. Create `clinzo-dev` at https://supabase.com/dashboard, choose your region and
   save the database password privately. Use a separate project for production.
2. From C:\startup, install dependencies and sign in:

```powershell
pnpm install
pnpm supabase login
pnpm supabase link --project-ref YOUR_PROJECT_REF
pnpm supabase migration list --linked
pnpm db:check
```

3. Review the migration list and dry run. After the pending files pass on a
   disposable Supabase database, apply them to the linked development project:

```powershell
pnpm db:migrate
```

`db:migrate` runs `supabase db push --linked`. Supabase CLI owns the single applied
migration history. `db:check` only previews pending files; it does not execute or
prove the SQL. If this database previously used the removed custom Drizzle runner,
reconcile applied versions before pushing; do not blindly replay its migrations.
The linked project has only the three initial migrations. Every later migration
is pending there. All 30 passed on the disposable project. Cross-client device behavior
remains unverified before running `db:migrate` on the linked project.
Without local Docker, use the guarded hosted-disposable workflow in
[packages/database/README.md](../packages/database/README.md#hosted-verification-without-docker).
Its `-UseCli` mode requires no database password and never relinks this checkout.

4. Set the same project URL and publishable key in each app's local environment:
   web uses NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
   Expo uses EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
   These values are passed to the shared client factory. Never use a secret key
   or a database connection URL in client apps.
5. Generate types after migration using `pnpm supabase gen types typescript --linked
--schema public` and save its output to
   `packages/data-access/src/generated/database.types.ts`. Its current contents
   are an explicitly handwritten bootstrap contract, not a generated DB snapshot.

## Daily development

- Table change: edit Drizzle models, run `pnpm db:generate`, review the SQL.
- RPC/policy change: run `pnpm supabase migration new descriptive_name`, edit SQL.
- Apply either through Supabase CLI only. Do not use drizzle-kit push/migrate.
- `migrations/meta` tracks Drizzle generation snapshots, not applied migrations.
- The empty `schemas/` files are historical placeholders, not a second schema source.
- Deploy only implemented Edge Functions by name, never all placeholder folders.

Supabase Edge Functions use its Deno-compatible runtime. Atomic booking and queue
changes belong in authorized transactional PostgreSQL RPC functions. Edge handlers
verify callers, validate input and call those RPCs when an integration is needed.
Payment webhooks additionally verify the provider signature and process idempotently.

## Next implementation slice

Review promotion to the intended development project, configure SMS delivery, provision an authorized
portal member and test cross-app clinic and ambulance journeys on devices.
Guest SOS, automatic dispatch escalation, background driver location and
notifications need separate implementation and verification.

Optional local Supabase development uses Docker with `pnpm supabase start`.
Hosted login/link/db push do not require running that local stack. `config.toml`
auth redirects and exposed schemas configure local development; configure the
hosted Auth redirect allowlist separately when enabling actual app login flows.

References: https://supabase.com/docs/guides/local-development/database-migrations
and https://supabase.com/docs/guides/functions.
