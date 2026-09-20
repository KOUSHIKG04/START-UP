# Shared backend scaffold

This directory is an empty scaffold for a backend shared by patient-mobile,
doctor-mobile, driver-mobile and web. No project has been created or connected.
There are no implemented tables, policies, functions, test cases or credentials.
The empty config is a placeholder, not a deployable Supabase configuration.

- `schemas`: reserved for domain SQL definitions.
- `migrations`: reserved for reviewed, versioned database migrations.
- `functions`: reserved for trusted workflows and shared server helpers.
- `tests/database`: reserved for database constraints and access-policy checks.
- `seed.sql`: reserved for local development data.

During integration, initialize the CLI configuration, implement the schema and
authorization policies, and generate types into
`packages/data-access/src/generated/database.types.ts`. Choose and document one
schema/migration workflow before creating database objects.

Use a shared backend per environment, with development and staging isolated from
production. Each app configures its own session/client; server secrets never belong
in client packages. Booking and dispatch state transitions must be authorized and
atomic on the server. No backend dependencies are installed by this scaffold.
