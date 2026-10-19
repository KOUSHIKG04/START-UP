# Manual database fixtures

`../seed.sql` is the main SQL demo fixture. Supabase automatic seeding remains
disabled in `config.toml`; no fixture runs during startup or this folder cleanup.

`demo-alternative.sql` preserves the differing former `seed_demo_data.sql` file
byte-for-byte. It is retained as an alternative fixture, not merged into the main
seed or configured for automatic execution. Review its differences and the target
database before deliberately choosing it. Moving it did not change its SQL.

`packages/database/tooling/seed.ts` is a separate trusted Drizzle synthetic
solo-doctor fixture behind the existing `db:seed` command. It is not another
database and is not an application startup path.

Fixtures are not migrations or verification of live accounts/workflows. Keep
them separate from production promotion and rollback smoke tests.
