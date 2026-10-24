# Shared Edge Functions

Each implemented endpoint has its own `index.ts` and genuinely local helpers.
These deploy to Supabase's Deno-compatible runtime; no separate Bun server is
required. App-facing invocation adapters stay in `packages/data-access`.

## Implemented source owners

| Folder                | Responsibility                                        |
| --------------------- | ----------------------------------------------------- |
| `send-notification`   | Push delivery and receipt handling                    |
| `online-video-token`  | Authorized online consultation room-token integration |
| `ambulance-hospitals` | Ambulance destination lookup and place helpers        |
| `search-map-places`   | Place search, provider results and error mapping      |
| `resolve-map-address` | Address resolution and provider response mapping      |

Helpers such as `places.ts`, `address.ts` and `errors.ts` stay beside their
handler. Similar filenames alone do not justify sharing them. Add a shared module
only when actual callers share the same responsibility. The unused empty
`_shared/index.ts` scaffold has been removed.

`deno.json`, `deno.d.ts` and `tsconfig.json` remain at the functions root. Existing
handler code, runtime imports, authorization and local `enabled`/`verify_jwt`
settings are unchanged. Source presence does not establish hosted deployment or
configured provider credentials.

Deploy a deliberately reviewed implemented function by name:

```powershell
pnpm supabase functions deploy FUNCTION_NAME
```

Use the intended environment explicitly when operating on hosted projects.

## Planned integrations

The following are planned endpoint names, not existing implementations. Their
empty source files were removed and their existing config entries remain disabled.

- `reserve-appointment`: optional integration around the existing atomic booking
  RPC. Database capacity, authorization and idempotency remain transactional.
- `dispatch-ambulance`: trusted orchestration around existing dispatch/trip
  operations. Matching and acceptance state belong to PostgreSQL transactions.
- `process-payment`: provider initiation/verification and signed webhook handling.
  Extend existing payment models; share client-safe schemas and backend operations
  through `packages/contracts` and `packages/data-access`.

Create each handler with the Supabase CLI when its working integration is
implemented. Include caller/resource authorization, runtime validation, provider
secret handling and focused tests. Payment events need verified signatures and
idempotent processing. Provider SDK setup does not belong in shared UI.

See [backend ownership](../README.md) and the
[package extension guide](../../packages/ARCHITECTURE.md).

## Appointment recovery and the payment boundary

Appointment attendance, recovery requests and rescheduling use the existing
PostgreSQL clinic RPC owner, implemented locally in
`20261023075921_appointment_recovery_and_rescheduling.sql`. They do not require a
new Edge Function. Authorization, optimistic versions, idempotent replacement,
capacity release/reservation, lineage and queue updates stay in one database
transaction; private request rows are read through authorized appointment projections.
Policy edits use a separate authenticated, versioned schedule-permission RPC.
Source presence does not establish migration deployment.

`process-payment` remains a disabled, planned integration. The existing
`clinzo.payment` and `fare_quote` models reference ambulance bookings; consultation
billing requires appointment-specific persistence and verified allocations before
paid consultation bookings or payment carry-over can be enabled. Recovery currently
creates no charge, credit, deduction, provider operation or refund. Provider capture,
signed webhooks, refund outbox/reconciliation and financial permissions must be
implemented before activating real money. See the
[appointment recovery payment plan](../../APPOINTMENT_RECOVERY_PAYMENTS.md) for the
required ownership, policy decisions and tests.
