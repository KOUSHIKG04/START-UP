# Edge Functions shared by all apps

These folders belong to the Supabase-first backend and deploy to Supabase's
Deno-compatible runtime. No separate Bun API server is required.

- reserve-appointment: optional integration/orchestration wrapper around an atomic,
  authorized booking RPC. Database correctness belongs in the RPC transaction.
- dispatch-ambulance: trusted dispatch orchestration; durable matching/acceptance
  state must be transactionally protected in PostgreSQL.
- process-payment: signed provider webhooks and idempotent payment handling.
- send-notification: authorized provider calls using server-held credentials.
- _shared: reusable handler validation, authorization and integration helpers.

The index.ts files are currently empty placeholders. Individual functions remain
disabled until implemented and tested; do not deploy them as working endpoints.
Create a handler with the Supabase CLI when implementing its actual workflow.
Store provider secrets in Supabase secrets. Validate caller identity and resource
permissions; possession of a publishable key alone is not authorization.

For an implemented handler only:
`pnpm supabase functions deploy FUNCTION_NAME`

All four apps invoke the same deployed functions through their Supabase client.
See ../README.md for the shared backend setup and build order.
