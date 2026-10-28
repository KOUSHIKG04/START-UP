# Backend SQL tests

`smoke/schedule-publication-performance.cli-smoke.sql` verifies repeated saves,
quota-only saves with stable window IDs, fee/duration/eight-block rebuilds, booking
preservation and invalid timezone rejection under an eight-second timeout. It uses
an existing managed practice (preferring Doctor-02) and rolls back every write.
Run only after `20261027143412_schedule_publication_performance.sql` is deployed:

```powershell
pnpm supabase db query --linked --file supabase/tests/smoke/schedule-publication-performance.cli-smoke.sql
```

`smoke/*.cli-smoke.sql` contains the existing transactional smoke fixtures moved
from the database package. Their SQL bytes, fixture behavior and result-field names
are unchanged. Each script begins a transaction and rolls back its fixtures.

These are CLI SQL checks returning success fields, not pgTAP test files. Do not
run them as though `supabase test db` expects their JSON output. Add actual pgTAP
checks under `tests/database` when implemented; the three empty RLS test stubs
were removed rather than treated as passing coverage.

## Existing guarded runner

From the repository root, set `TEST_PROJECT_REF` to an explicitly disposable
project, separate from the linked project, then run:

```powershell
& ./packages/database/tooling/verify-disposable.ps1 -UseCli
```

This preserves the existing dry-run behavior. Only the explicit `-UseCli -Apply`
mode applies reviewed pending migrations to that disposable project and runs the
runner's selected smoke suite. It is not an automatic step in a source cleanup.
The runner rejects the linked project, checks command failures and requires each
selected script's success field. Other smoke files remain available for targeted
verification of their domain on the reviewed disposable target.

Model and filesystem contract checks need no database:

```powershell
pnpm --filter @startup/database test
```

Optional Bun database integration checks retain their existing opt-in environment
setup under [packages/database](../../packages/database/README.md). A skipped
database suite or a filesystem test does not establish SQL/RLS correctness.

Historical dated audit notes may contain pre-move paths; use this guide and the
current runner for active verification. No hosted SQL was executed to move files.
