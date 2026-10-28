# Shared Supabase backend

## Schedule publication performance

`20261027143412_schedule_publication_performance.sql` was deployed to the linked
project on 2026-10-27. A reproduced Doctor-02 publication took about nine seconds,
exceeding the authenticated eight-second statement timeout. Transaction profiling
attributed about 8.4 seconds to 178 repeated timezone-catalog validations.

The existing validator now accepts unchanged validated values without re-enumerating
the catalog. Generated sessions/booking days can prove their timezone against an
already-validated private schedule rule. New or changed unproven values retain the
catalog check, including rejection of invalid timezones. Generated sessions reuse
existing booking days. An identical published grid, including all blocks, preserves
rule/window IDs and changes only quotas/auto-accept settings; changed days, times,
duration, fee, travel buffer or effective rule coverage retain the established
regeneration path. Authorization, optimistic versions, booking protection, live
events and the thirty-day horizon retain their existing owners. The global/API
timeout is unchanged; the Doctor app and Facility Portal share the same fixed RPC.

The dedicated rollback fixture runs unchanged, quota-only, fee, duration and
eight-block publications together under an eight-second statement timeout. In the
predeployment run those cases took about 21 ms, 9 ms, 924 ms, 1.38 s and 2.71 s.
Mixed-service and same-day smoke checks also passed. The mixed-service fixture was
scoped to Doctor-02 because its default practice selection can choose another
doctor with an already overlapping second practice. The older duration fixture
still has stale app/walk-in quota inputs; its full legacy sequence was not reported
as passing. The dedicated fixture separately verifies duration changes and unchanged
appointment/window snapshots. All fixture writes roll back. App/device confirmation
and concurrent production-load timing remain separate from database verification.

Patient, Doctor, Driver, Facility Portal and Company Admin use the same Supabase
project within an environment. Supabase provides Auth, PostgreSQL, RPCs, RLS,
Realtime, Storage and Edge Functions. There is no separate deployed Bun API.

## Ownership

| Location                   | Responsibility                                                                   |
| -------------------------- | -------------------------------------------------------------------------------- |
| `migrations/`              | Ordered SQL history for tables, constraints, RPCs, triggers, policies and grants |
| `migrations/meta/`         | Existing Drizzle generation snapshots/journal; not a second deployment history   |
| `functions/<name>/`        | Implemented integration handlers and their local helpers                         |
| `tests/smoke/`             | Transactional SQL smoke checks used by the guarded disposable runner             |
| `seed.sql`                 | Main manual SQL demo fixture; automatic seeding remains disabled                 |
| `fixtures/`                | Preserved alternative SQL fixtures, excluded from automatic seeding              |
| `config.toml`              | Local CLI settings; hosted settings are managed separately                       |
| `../packages/database/`    | Optional Drizzle models, trusted tooling and model/integration tests             |
| `../packages/data-access/` | App-facing Supabase operations, client factories and wire types                  |
| `../packages/contracts/`   | Client-safe domain schemas and inferred types                                    |

Read the root [working rules](../AGENTS.md) and
[package ownership guide](../packages/ARCHITECTURE.md) before changing boundaries.

## Why the database package remains

`packages/database` is tooling for this same PostgreSQL database, not another
database or API service. Its Drizzle models support table SQL generation, model
checks and the optional synthetic fixture. Apps use Supabase through
`packages/data-access`; they must not import the trusted database client/models.

Supabase CLI owns the applied migration history. For table changes, maintain the
existing Drizzle model owner and review generated SQL before applying it. Models
are not automatically synchronized with later SQL-only changes or a hosted
project; check for drift before generating new table SQL. RPCs, triggers and
policies remain versioned SQL. Do not use Drizzle push/migrate as a second runner.

The unused `schemas/*.sql` placeholders were removed. `schema_paths = []` remains
unchanged; this repository has not switched to Supabase declarative schemas.

## Local implementation and deployment

The structural cleanup verified 134 local SQL migrations through
`20261015160452_consultation_intake_flow.sql`, preserving their bytes and metadata.
That is a local inventory, not evidence that every migration is applied anywhere.
Use the intended environment's migration list and review pending changes before
promotion. Older dated audit/test notes may describe a different deployment state.

Eight functions have implementations: `send-notification`,
`online-video-token`, `ambulance-hospitals`, `search-map-places` and
`resolve-map-address`, `process-payment`, `razorpay-webhook` and
`payment-reconcile`. The payment migrations/functions were deployed on 2026-10-24
with user authorization, including a follow-up ambulance worker alias fix.
Consultation billing is enabled in test mode; live payments, marketplace collections
and Route transfers remain disabled. Signed webhook and server-worker probes passed;
native Checkout and real payment/refund flows remain unverified. See the
[current setup guide](../APPOINTMENT_RECOVERY_PAYMENTS.md) and
[function ownership](functions/README.md). Source
presence does not prove deployment, configured provider secrets or device behavior.

## Development workflow

From the repository root, use the existing commands:

```powershell
pnpm supabase migration list --linked
pnpm db:check
```

Table generation remains `pnpm db:generate`; custom SQL changes start with
`pnpm supabase migration new descriptive_name`. Review the resulting SQL and
verify it against an explicitly disposable target before a deliberate promotion
with `pnpm db:migrate`. Never rename, reorder or rewrite existing migration files
as folder cleanup. Keep `migrations/meta` intact.

Optional local development uses Docker and `pnpm supabase start`. Hosted CLI
commands do not require a running local stack. The checked-in `config.toml`
controls local services; it does not establish hosted Auth redirects, provider
configuration, migration status or function deployment.

## Tests and fixtures

Read [tests/README.md](tests/README.md). SQL smoke checks are now in
`supabase/tests/smoke`; model and Bun integration tests remain in
`packages/database/tests`. The existing
`packages/database/tooling/verify-disposable.ps1` runner keeps its explicit
target guard and opt-in migration behavior; only its smoke-file locations changed.

Automatic seeding remains disabled (`enabled = false`, `sql_paths = []`).
`seed.sql` is the main manual SQL fixture. The differing former
`seed_demo_data.sql` fixture is preserved byte-for-byte as
`fixtures/demo-alternative.sql`; it was not merged or executed. See
[fixture notes](fixtures/README.md) before selecting a fixture.

## Generated types and application configuration

Each app uses its environment's project URL and publishable key: Expo reads
`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; web reads
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Provider
secrets, service-role credentials and direct database URLs stay out of app bundles.

After an intentional schema deployment, generate wire types with:

```powershell
pnpm supabase gen types typescript --linked --schema public
```

Save successful TypeScript output to
`packages/data-access/src/generated/supabase.types.ts`. The separate
`database.types.ts` file is a handwritten compatibility overlay importing that
output; do not overwrite it. Review both the generated diff and app typechecks.
This cleanup does not regenerate types or query a hosted database.

## Upcoming integrations

Optional reservation orchestration and automatic dispatch orchestration
are documented in [functions/README.md](functions/README.md). Their empty handlers
were removed; their existing local configuration entries remain disabled.
Create code with its first working implementation instead of reserving folders.
Payment models already belong to `packages/database/src/schema/payments.ts`;
shared payment contracts and operations belong to their corresponding packages.

Structural checks do not replace hosted migration, SQL/RLS, provider, browser or
multi-device verification. No migrations, seeds or function deployments run as
part of this cleanup.

References: [Supabase migrations](https://supabase.com/docs/guides/local-development/database-migrations),
[database testing](https://supabase.com/docs/guides/database/testing), and
[generated types](https://supabase.com/docs/guides/api/rest/generating-types).
