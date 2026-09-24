# Shared database models (trusted tooling only)

Supabase is the backend for all four applications. This package preserves the 79
baseline Drizzle domain models, database constraints and synthetic solo-doctor seed.
The UI/database review adds two aggregate inventory models, and onboarding adds
two driver invitation models (83 total locally). Post-baseline migrations are not
applied to the linked development project; they were verified on a disposable project;
see ../../plans/ui-db-validation/README.md. It is
not an HTTP server and must never be imported into browser or Expo bundles.

- `src/schema/`: typed models; edit these for table changes.
- `src/client.ts`: pooled PostgreSQL connection for trusted scripts.
- `tooling/seed.ts`: optional development fixture, not an Auth account.
- `tests/integration.test.ts` and `tests/clinic.integration.test.ts`: opt-in
  checks against an already migrated, disposable Supabase database. They roll
  back their fixtures, including temporary Auth users. The clinic test follows
  solo-doctor onboarding through a completed appointment.
- `tests/clinic.cli-smoke.sql`: passwordless, rolled-back clinic workflow smoke
  test for a disposable hosted project. It covers the main onboarding-to-completion
  path but does not replace the full Bun integration suite.
- `tests/inventory.cli-smoke.sql`: rolled-back tenant, role, version, count,
  audit and event checks for aggregate facility bed inventory.

From C:\startup:

```powershell
pnpm db:generate
pnpm --filter @startup/database typecheck
pnpm --filter @startup/database test
```

Review generated SQL in `supabase/migrations/`. Drizzle metadata is only used for
schema generation. Supabase CLI is the only migration runner; do not use Drizzle
migrate/push or create a second migration ledger. SQL-only RPC/policy changes use
`pnpm supabase migration new descriptive_name`.

Optional seed: copy `.env.example` to `.env` in this package, configure a development
project database URL, then run `pnpm --filter @startup/database db:seed --demo`.
Bun is used only for the local seed and tests, not for a deployed backend server.
The fixture creates no real Auth login, patient data, staff employee or beds.

For integration tests, set TEST_DATABASE_URL and the exact opt-in value from the
environment example, apply migrations to that disposable database with Supabase
CLI, then run `pnpm --filter @startup/database test:database`. Without those
variables, the suite skips; a skipped test is not evidence that SQL works.

### Hosted verification without Docker

Create a **second, empty Supabase project** for disposable tests. In its dashboard,
copy the project ref. The passwordless CLI mode is the simplest verification path.
Do not use the project already linked to this repository or put the URL in Git or
chat. Replace the placeholder below with the real 20-character ref shown in the
new project's dashboard URL or Project Settings; the text
`YOUR_DISPOSABLE_PROJECT_REF` is not a valid value. From the repository root in
PowerShell:

```powershell
$env:TEST_PROJECT_REF = "YOUR_DISPOSABLE_PROJECT_REF"
& .\packages\database\tooling\verify-disposable.ps1 -UseCli
# Review the migration list and dry run. Then:
& .\packages\database\tooling\verify-disposable.ps1 -UseCli -Apply
```

`-UseCli` uses your existing Supabase CLI login, requires no database password,
and runs transactional clinic and inventory smoke tests that roll back their fixtures.
Do not set `TEST_DATABASE_URL` or pass `-PoolerHost` in this mode. The script
refuses to run when the test ref matches the repository's linked project.

For the broader Bun integration suite, use the database-password path:

```powershell
$env:TEST_PROJECT_REF = "YOUR_DISPOSABLE_PROJECT_REF"
& .\packages\database\tooling\verify-disposable.ps1
# Review the read-only migration list and dry run. Then:
& .\packages\database\tooling\verify-disposable.ps1 -Apply
```

In this mode, the script constructs the direct PostgreSQL URL and encodes the
password entered at the hidden prompt. If your network cannot reach the direct
IPv6 endpoint, copy only the **Session pooler hostname** from Connect and pass
it with `-PoolerHost`; the script supplies the ref, username and port.

If the direct connection fails because your network is IPv4-only, open **Connect →
Session pooler** in the disposable project. Copy only the hostname between `@`
and `:5432` from its connection string; do not copy the password or whole URL.
Run the same commands with `-PoolerHost "THE_HOST_FROM_CONNECT"` (and `-Apply`
for the second command). The only interactive input is the database password. The script
confirms the project ref differs from the linked project and checks the URL.
`-Apply` pushes migrations **only to the disposable project**, then runs the
integration suite. A successful run must report passing tests, not skipped
tests. If the pooler returns SQLSTATE 28P01, the supplied database password
was rejected; the CLI smoke test above can still verify the core clinic flow.
Delete or reset the disposable project when finished.

See ../../supabase/README.md for hosted setup and current implementation limits.
