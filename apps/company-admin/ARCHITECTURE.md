# Company Admin architecture

Follow the repository [ownership map](../../ARCHITECTURE.md) and
[working rules](../../AGENTS.md). This app uses Next.js App Router for the company
reviewer console.

Routes and layouts own URL parameters, metadata and the authenticated shell.
Verification owns the overview, queue, case detail, document decisions and final
verification workflows. Authentication owns the login UI and sign-in/out actions.
Feature UI, hooks, named types, display constants and server operations stay with
their feature. Create directories only with implemented code.

The request-scoped Supabase client and cookie handling stay in `src/lib`.
`requireReviewer` remains a server-only authorization boundary used by protected
pages and every review action. Moving a module must preserve that check, input
validation, redirects, document response headers and cache revalidation paths.

Routes compose public feature exports. Keep server-only entry points separate
from client-consumed modules; Server Actions retain their `"use server"` boundary.
Shared UI uses `@startup/web-ui`; shared domain types and backend operations use
the existing contracts and data-access packages. Client components must not
import the request-scoped client or reviewer guard.

Structural cleanup preserves URL paths, search parameter filtering, keyed table
resets, form action bindings, pending states and toast/refresh effects. Source and
mocked tests do not establish deployed authorization or browser behavior.

## Implemented feature ownership

See [FEATURE_STRUCTURE.md](FEATURE_STRUCTURE.md) for the file-by-file review.
Verification screens are composed by thin route exports. Server-only loaders own
overview, queue and case reads, while `verification/server/actions.ts` owns document
decisions and finalization. UI sections, form hooks, types and display constants
stay in the verification feature. Auth owns login UI and server sign-in/out actions.
The request-scoped client and `requireReviewer` guard remain in `src/lib`.

The `server.ts` auth entry is a separate guarded entry for server composition;
client forms import only the action module. Client code never imports query loaders
or the reviewer guard. Keep `index.ts` exports deliberate and route-owned.

## Verification commands

```sh
pnpm --filter company-admin check:architecture
pnpm --filter company-admin test:architecture
pnpm --filter company-admin test
pnpm --filter company-admin lint
pnpm --filter company-admin typecheck
pnpm --filter company-admin build
```

The architecture inspector and small test tools are reused from Facility Portal
scripts. This is repository tooling reuse, with no application runtime dependency.
Existing baseline diagnostics and browser/deployment limits are recorded in the
feature review. Do not infer successful deployment from local source checks.

## Company finance and payouts

`src/app/(admin)/payments/page.tsx` composes `features/payments`. The feature owns
`screens/payments-screen.tsx`, its `payment-form`, `utils/paymentConstants.ts`,
`server/loadPayments.ts` and `server/actions.ts`. The loader and every mutation
retain `requireReviewer` and check `hasCompanyFinanceAccess`; backend RPCs also
enforce financial authorization. The migration grants nobody finance membership.
An operator must confirm the Auth user's enabled identity and confirmed company
reviewer membership before explicitly granting `clinzo.company_finance_member`.
Reviewer access alone is insufficient.

`/payments` owns separate appointment/ambulance commission rates, matching gateway
mode, payout enablement and a 0–168 hour release delay. Defaults are disabled/test
and rates unconfigured (`NULL`), with no assumed percentage. It pages through the
private payout ledger, applies only missing terms to unconfigured entries, sets
completed-trip final fares, verifies Route recipients and processes/reconciles
payout work. Cash commission confirmation requires a unique receipt reference,
note and current amount; it records money actually received by the company.

Recipient onboarding is assisted through Razorpay Dashboard: complete KYC and
Route activation there, then save the legal name and `acc_...` / `acc_prd_...` IDs
for the actual contracted doctor/facility or driver/operator payee. No bank/KYC
form or client secret storage is implemented. The server verifies activated Route
product status before fresh transfers. Adding a recipient retires the previous
one for future receipts; pending historical entries keep their old recipient and
stop until finance resolves configuration. Configured/history terms cannot be
rebound by `apply_terms`.

Captured receipts freeze rate and recipient. Transfers require completed care,
release delay and all database/server Route gates. Transfer and reversal POSTs are
claimed once; uncertain outcomes are reconciled by provider GET/notes. There is
no automatic POST replay or failed retransfer, and never-found operations require
provider investigation. Cash creates a receivable, not an automatic split/debit.
Company commission is gross revenue; company absorbs raw gateway/Route fees and
taxes. GST invoices and TDS automation are not implemented. Ambulance refunds
currently reconcile Dashboard refunds rather than exposing self-service requests.

Both payment migrations, the ambulance worker alias follow-up and three payment
functions were deployed on 2026-10-24 with user approval. Consultation test billing
is enabled; marketplace collections and Route remain disabled, commission rates
remain unconfigured and no finance membership was granted. No Route eligibility, native/browser flow or actual
provider transfer is established by host tests. See the
[payment guide](../../APPOINTMENT_RECOVERY_PAYMENTS.md) for explicit grants,
secrets, activation and rollback verification boundaries.
