# Shared Edge Functions

Each implemented endpoint has its own `index.ts` and genuinely local helpers.
These deploy to Supabase's Deno-compatible runtime; no separate Bun server is
required. App-facing invocation adapters stay in `packages/data-access`.

## Implemented source owners

| Folder                | Responsibility                                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `send-notification`   | Push delivery and receipt handling                                                                                          |
| `online-video-token`  | Authorized online consultation room-token integration                                                                       |
| `ambulance-hospitals` | Ambulance destination lookup and place helpers                                                                              |
| `search-map-places`   | Place search, provider results and error mapping                                                                            |
| `resolve-map-address` | Address resolution and provider response mapping                                                                            |
| `process-payment`     | Authenticated appointment/ambulance checkout, verification, reconciliation, appointment refunds and company finance actions |
| `razorpay-webhook`    | Signature-verified Razorpay payment/refund/transfer events                                                                  |
| `payment-reconcile`   | Trusted server-only appointment/ambulance reconciliation, refund and Route payout worker                                    |

Helpers such as `places.ts`, `address.ts` and `errors.ts` stay beside their
handler. Similar filenames alone do not justify sharing them. Add a shared module
only when actual callers share the same responsibility. The unused empty
`_shared/index.ts` scaffold has been removed.

`deno.json`, `deno.d.ts` and `tsconfig.json` remain at the functions root. Source
presence and local `enabled` settings do not establish hosted deployment or
configured provider credentials. Shared Razorpay helpers are real cross-endpoint
owners under `_shared`; they do not recreate the removed empty index scaffold.

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

Create each handler with the Supabase CLI when its working integration is
implemented. Include caller/resource authorization, runtime validation, provider
secret handling and focused tests. Payment events need verified signatures and
idempotent processing. Provider SDK setup does not belong in shared UI.

See [backend ownership](../README.md) and the
[package extension guide](../../packages/ARCHITECTURE.md).

## Appointment recovery and consultation billing

Appointment attendance, recovery requests and rescheduling use the existing
PostgreSQL clinic RPC owner, implemented locally in
`20261023075921_appointment_recovery_and_rescheduling.sql`. They do not require a
new Edge Function. Authorization, optimistic versions, idempotent replacement,
capacity release/reservation, lineage and queue updates stay in one database
transaction; private request rows are read through authorized appointment projections.
Policy edits use a separate authenticated, versioned schedule-permission RPC.
Source presence does not establish migration deployment.

The recovery migration was deployed on 2026-10-24 with approval. Consultation
billing is separately implemented in
`20261024061251_appointment_razorpay_billing.sql`; its private appointment-specific
tables do not reuse ambulance `clinzo.payment`/`fare_quote` foreign keys.

`process-payment` uses `withSupabase({ auth: "user" })` and verifies appointment
access before exposing actions. `razorpay-webhook` uses `auth: "none"` with gateway
JWT verification disabled because Razorpay authenticates by raw-body HMAC and
`x-razorpay-signature`. It requires event ID, checks optional merchant account,
fetches provider state, and deduplicates event/digest. Never parse or modify the
body before signature verification.

`payment-reconcile` uses `auth: "secret"` with gateway JWT verification disabled;
only a trusted server invokes it using a Supabase secret (`sb_secret_...`) in the
`apikey` header. Never use a client publishable key or expose the secret in app
configuration. Scheduling is not installed by deploying the function. Per-appointment
app refresh and authorized manual processing also reconcile provider state.

`_shared/razorpay.ts` owns provider mode validation, HMAC and HTTPS calls.
`_shared/appointmentPayments.ts` coordinates database commands, orders, capture
verification and refund jobs. Provider POSTs happen outside booking transactions.
Uncertain requests are reconciled by receipt rather than blindly repeated; receipt
lookup is bounded to 1000 records and unresolved work needs operator investigation.

Copy `.env.example` to ignored `.env.local`, fill only server-side test credentials
and upload through `pnpm supabase secrets set --env-file supabase/functions/.env.local`.
The required variables are `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
`RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_MODE=test` and `RAZORPAY_LIVE_ENABLED=false`.
Optional merchant restriction/previous webhook secret support rotation. Keep all
secret values out of public client variables and source control.

The two payment migrations, the ambulance worker alias follow-up migration and
all three payment functions were deployed on 2026-10-24 with user approval.
Consultation billing is enabled in test mode with zero deduction. The test API
keys passed a read-only Razorpay request; signed no-op webhook and authenticated
worker probes passed. Live payments, Route and marketplace collections remain
disabled. Actual native Checkout, captures/refunds and provider webhook delivery
remain unverified. Live operation additionally requires explicit
`RAZORPAY_LIVE_ENABLED=true`, matching mode/keys and owner-approved activation.
See the [payment setup guide](../../APPOINTMENT_RECOVERY_PAYMENTS.md) for exact key
generation/storage, named deployment commands, webhook URL/events, activation,
native rebuilds, tests and known limitations.

Provider-mock checks passed 8/8 and database schema-model checks 5/5. Final Edge
TypeScript checks passed. Complete billing and existing
recovery SQL workflows passed in outer rollback transactions with no retained
schema/charges. That initial pass did not use provider keys, sandbox calls or hosted
deployment. Deployment and credential validation have since completed as described
above; no actual refunds or transfers were run. The durable worker rotates selection by `last_checked_at`; cash-only
client refresh/processing uses fresh billing RPCs without provider function calls.

## Marketplace commission and Route extension

`_shared/ambulancePayments.ts` owns ambulance orders, capture verification and
provider reconciliation over the canonical payment/fare owners.
`_shared/marketplacePayouts.ts` owns Route product verification, transfer/reversal
processing and payout reconciliation. The existing `process-payment` authenticates
and authorizes appointment, ambulance and finance actions before invoking these
helpers. Finance actions require the enabled identity's existing confirmed company
reviewer membership plus an explicit active `company_finance_member` row. The
marketplace migration grants this role to nobody.

`razorpay-webhook` keeps its raw-body signature boundary and fetches provider state
before choosing appointment or ambulance processing. Transfer events fetch and
verify the saved transfer. `payment-reconcile` now rotates through appointment,
payout and ambulance work. It remains trusted-server-only and requires an
independently configured scheduler; source/deployment does not install one.

The same server Razorpay key pair serves Checkout and Route. Add
`RAZORPAY_ROUTE_ENABLED=false` and `RAZORPAY_ROUTE_LIVE_ENABLED=false` to setup.
Fresh transfers require the Route flag, enabled matching database configuration,
configured commission, a verified active legal recipient, completed care and the
0–168 hour release delay. Live transfers also require the Route live flag and the
existing live-payment gates. Merchant Route approval, Dashboard KYC/product
activation and provider settlement eligibility remain external setup requirements.
The server checks activated product status and accepted terms before a fresh
transfer; client-entered `acc_...` / `acc_prd_...` identifiers are insufficient.
No bank/KYC forms or secrets belong in app UI.

Transfers and reversals claim their POST once. Uncertain outcomes are reconciled
using GET and saved IDs/notes, bounded to 20 pages of 100 records for Route lookups.
There is no automatic POST replay or failed retransfer. If reconciliation cannot
find an operation, finance must investigate provider records. Appointment refunds
reverse transferred provider liability before patient refund processing. Ambulance
currently reconciles provider Dashboard refunds, without a self-service refund
request/approval implementation. Cash confirmation records an audited receipt and
company commission receivable; a unique finance receipt separately confirms
commission received, with no automatic cash split/debit.

`20261024061251_appointment_razorpay_billing.sql`,
`20261024075732_marketplace_commissions_and_route.sql`, the ambulance worker alias
follow-up and all three payment functions are deployed. Consultation test billing
is enabled; marketplace collections/Route remain disabled with commission rates
unconfigured. Provider/security mocks
passed 14 checks. Billing, canonical ambulance and payout SQL suites passed
together through `packages/database/tooling/verify-marketplace-payments.ps1`, in
one outer rollback with no retained schema/fixtures or migration-history changes.
The runner defaults to local; explicit `-Linked` selects the linked backend. Use
its default DDL mode only before all three migrations are deployed. For an already
deployed schema, use `-Linked -DeployedSchema`; fixture-specific billing changes are
isolated inside the outer rollback. Native/browser captures/refunds and actual
transfers remain unverified. Follow the
[payment guide](../../APPOINTMENT_RECOVERY_PAYMENTS.md) for full activation and
recipient/fee-history limitations.
