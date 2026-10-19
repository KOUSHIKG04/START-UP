# Shared database models (trusted tooling only)

This package is optional Drizzle tooling for the same Supabase PostgreSQL backend
used by Patient, Doctor, Driver, Facility Portal and Company Admin. It does not
create another database or a separately deployed API. Keep its trusted client and
models out of browser and Expo bundles.

| Location                         | Responsibility                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------ |
| `src/schema`                     | Domain table models for optional SQL generation and model checks               |
| `src/client.ts`, `src/config.ts` | Trusted PostgreSQL tooling client and URL validation                           |
| `drizzle.config.ts`              | Offline generation into the root Supabase migration history                    |
| `tooling`                        | Explicit development fixtures, maintenance scripts and disposable verification |
| `tests`                          | Drizzle model/filesystem checks and opt-in Bun database integration tests      |
| `../../supabase/tests/smoke`     | Existing transactional SQL smoke fixtures                                      |

Supabase CLI owns the applied migration history. Drizzle metadata is for
generation only; never run Drizzle push/migrate as a second runner. Models are not
automatically synchronized with SQL-only changes or a hosted project. Review
model/schema drift and generated SQL before deliberately promoting changes.

The existing `src/schema/payments.ts` owns payment models. Future integrations
extend that owner through root migrations, shared contracts/operations and server
handlers; do not create another model tree. See the
[package ownership guide](../ARCHITECTURE.md) and
[Supabase guide](../../supabase/README.md). This cleanup changes no models,
constraints, migrations, generated wire types or deployed state.

## Checks and fixtures

From the repository root:

```powershell
pnpm --filter @startup/database test
pnpm --filter @startup/database typecheck
```

The model and filesystem tests do not connect to a database. SQL smoke checks
moved byte-for-byte to `supabase/tests/smoke`; the existing
`tooling/verify-disposable.ps1` interface and explicit target guards are preserved.
See [backend SQL test instructions](../../supabase/tests/README.md).
The `.cli-smoke.sql` fixtures are not pgTAP files.

`tests/integration.test.ts` and `tests/clinic.integration.test.ts` remain explicitly
opt-in checks against an already migrated disposable database. Without their
environment setup they skip; skipping is not evidence that deployed SQL works.

`tooling/seed.ts` remains the optional synthetic Drizzle fixture behind the
existing `db:seed` command. The main manual SQL demo fixture is
`supabase/seed.sql`; a differing alternative is preserved under
`supabase/fixtures`. None is executed by this cleanup, and automatic SQL seeding
stays disabled. Keep fixture selection explicit and separate from deployment.

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
