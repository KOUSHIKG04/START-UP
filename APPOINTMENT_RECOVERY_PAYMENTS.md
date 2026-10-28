# Appointment recovery and consultation payments

## Current implementation and deployment boundary

Consultation billing has a deployed Razorpay test integration for Patient, Doctor and
Facility Portal. Patient app bookings use online checkout; reception payments
remain available to staff for clinic walk-ins. New online consultations created after billing activation require a
verified paid balance before first join/start. Earlier bookings retain their flow
unless they acquire a voluntary charge. An existing consultation can be rejoined.
Appointment status, payment status, attendance and refund status remain separate.

Recovery migration `20261023075921_appointment_recovery_and_rescheduling.sql` was
deployed on 2026-10-24 after approval. Billing migration
`20261024061251_appointment_razorpay_billing.sql`, marketplace migration
`20261024075732_marketplace_commissions_and_route.sql`, follow-up
`20261024111551_fix_ambulance_payment_worker_aliases.sql` and all three payment
Edge Functions were deployed to linked project `enjafragbcrrgaclwopd` on 2026-10-24
with user authorization. Consultation billing is enabled in `test` mode with zero
deduction, activated at 2026-10-24 17:22:33 IST. Earlier bookings keep the cutoff
behavior described below. Live payments, Route transfers and marketplace/ambulance
collections remain disabled; commission rates remain unconfigured (`NULL`).
No company commission percentage is assumed.

The corrected test API keys returned HTTP 200 on a read-only Razorpay request and
were uploaded from ignored `supabase/functions/.env.local`. A signed no-op webhook
probe and an authenticated reconciliation invocation returned HTTP 200. Unsigned
webhooks and unauthenticated endpoints returned HTTP 401. The user reported saving
the Test Mode webhook and proceeded after the automatic-capture setup step;
Dashboard settings were not independently inspected because local browser access
is disabled. Actual Razorpay webhook delivery, native Checkout, capture/refund
payments and Route transfers still need end-to-end testing. No recurring worker
schedule or company finance membership has been installed by this deployment.

The follow-up migration fixes an ambiguous SQL alias in the ambulance worker's
queue/work branches without changing the function signature or service-role-only
grants. The smoke fixture now executes both branches, and the repaired deployed
reconciliation worker passes with empty queues.

Payment surfaces extend the existing medical teal system, app themes, cards,
buttons, inputs and dialogs. No new palette, type scale or navigation model is
introduced. Native Checkout uses the existing Patient primary color. Test surfaces
explicitly say no real money is involved.

## What the apps do

| App             | Current local behavior                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Patient         | Appointment Details shows fee, paid/refunded amounts, balance, accepted terms, native checkout, provider references, refund requests and status refresh.                 |
| Doctor          | Appointment Details shows financial state; authorized staff can record clinic cash received, approve/decline refunds, reconcile provider work and confirm cash returned. |
| Facility Portal | The existing appointment review dialog contains the payment panel, with authenticated Server Actions for decisions and reception collection.                             |

Checkout is available for eligible confirmed appointments in the Android/iOS
Patient app. Clinic cash is recorded only after staff receive it and record a note
and acceptance of the displayed terms. Pending online orders must be reconciled
before cash collection. Cash refund approval is separate from audited confirmation
that the cash was physically returned. Cash-only refresh/processing returns fresh
billing through database RPCs without calling Razorpay; reception receipt/refund
confirmation therefore does not depend on provider keys.

Native checkout uses `react-native-razorpay` 3.0.0. A new native Patient build is
required; a JavaScript update or Expo Go cannot add the module. The adapter rejects
web/old-build checkout before creating an order. Doctor and Portal do not collect
Razorpay keys from staff or open Checkout.

If the billing RPC is not deployed (`PGRST202`), the clients omit the financial
surface rather than inventing balances. Other billing failures remain visible as
retry/error states. The reschedule preview shows the exact additional balance or
unused credit using the verified current charge balance.

## Payment, recovery and refund rules

- The server creates an order using the appointment's INR fee in integer paise.
  Only the public Key ID, order ID and checkout values return to Patient.
- Checkout success is verified by HMAC using the saved server order ID. Provider
  state, payment/order association, currency and amount are checked server-side.
  Authorization alone is not captured payment.
- The original charge follows a replacement transactionally. A higher replacement
  fee creates a balance due; a lower fee creates unused credit eligible for a
  separate refund request. Pending checkout/refund work blocks conflicting moves.
- Refund requests show eligible amount, deduction and return before submission.
  Cancellation approval cancels the appointment; surplus approval keeps it booked.
  Reserved amounts cannot also fund rescheduling.
- Approval checks current balance, request version and financial permission, then
  reserves durable jobs. Approval, provider processing and verified return have
  distinct statuses. Gateway refunds return to source; mixed cash/gateway receipts
  produce separate jobs.
- Charges snapshot the accepted policy. Initial policy is
  `consultation-zero-deduction-v1`, with `deduction_bps = 0`. No 10% deduction is
  approved or enabled. Doctor unavailability always has zero deduction.
- Financial management requires practice management and schedule-edit permission.
  Patient/family access uses authorized appointment RPCs. Raw billing tables deny
  direct anonymous/authenticated access under RLS.
- Existing private appointment events invalidate each app's `appointment-billing`
  cache. There is no public billing channel or separate session owner.

Attendance recovery still distinguishes expired requests, passed time, checked-in
waiting, patient no-show and doctor unavailability. Timers never complete visits.
Practice policy is separately editable: initial attendance grace is 15 minutes,
reschedule notice zero minutes and patient move allowance one. Late moves need
review; requested times are not held until approval. Capacity, source quotas,
lineage and fresh clinic arrival state retain transactional ownership.

## Pay & Book and approval-required bookings

The Patient booking dialog loads authoritative per-slot booking options. When the
shared daily auto-accept budget permits it, paid online checkout uses **Pay & Book**.
The server creates a pending payment reservation for at most ten minutes (bounded
by the booked end time). Only verified captured payment confirms that reservation
and creates its queue ticket/confirmation event. Authorization is insufficient.
Payment reservations reserve both capacity and the shared auto-accept budget.

When doctor approval is required, **Request appointment** creates the existing
pending request without checkout. After acceptance, Patient pays in Appointment
Details. Patient app clinic, video and home bookings use online payment only;
**Pay at reception** is reserved for staff-registered clinic walk-ins. Free bookings
retain immediate confirmation. Legacy reception bookings retain their stored
payment method and history. The patient booking API rejects reception requests.

Patient-only online payment was deployed on 2026-10-27 in
`20261027170816_patient_booking_online_payment_only.sql`. Booking options no longer
offer reception, and the canonical patient booking function rejects reception
requests before creating or retrying a booking. Existing reception bookings keep
their history. Staff walk-in registration and cash collection are unchanged.
Rollback checks covered capture-gated clinic/video booking, manual approval,
free visits, rejected reception bypasses, and staff channel capacity/registration.
Native Razorpay and screen transitions still require device verification.

Home-visit booking uses `prepare_home_visit_booking`, forwarding the selected saved
location ID into the existing booking implementation. Before reserving capacity,
the server checks verified patient access to the saved address, requires a map pin,
building and city, and checks PostGIS distance from the practice against the saved
home-visit radius. This validates coverage of the saved pin; it does not independently
verify the physical address. Unsupported/out-of-radius addresses cannot book.
The server snapshots the address, coordinates, instructions and optional receiver
contact on the appointment. Patient details, Doctor details and Facility Manage
appointment show the destination. Editing/deleting a saved address does not change
an existing visit; rescheduling preserves its destination and rechecks coverage.

`20261026150042_home_visit_booking_payment.sql` extends the existing canonical
booking owner with a saved-location argument and retains the legacy clinic/video
wrapper. It was deployed to the linked project on 2026-10-26; the full payment
smoke runner passed against the deployed schema with all fixture writes rolled back.
Billing remains enabled in Test Mode with zero deduction. The security advisor's
new home-related notice is the intended authenticated-only SECURITY DEFINER RPC;
anonymous execution and direct authenticated access to private booking helpers
are denied. Rollback SQL covers ownership, missing pins, coverage, capture confirmation,
retry identity, manual approval/payment and destination-preserving rescheduling.
Native checkout, map selection and delivered provider webhooks still require device
verification. No new keys, live payments or payouts are enabled by this change.

The native payment module is checked before creating a prepaid reservation. The
booking modal closes before checkout opens. Failed/closed checkout reconciles the
provider first; a known unpaid cancelled checkout releases the reservation.
Uncertain/authorized attempts retain the bounded hold. Expired reservations stop
using capacity, and cannot be confirmed manually. A late capture remains refundable
credit on the original booking and cannot reclaim a released/rebooked slot. Its
refund deduction is zero. Existing confirmed bookings are not rewritten.

The Patient Doctor Details screen now shows native loading feedback during booking
preparation, Razorpay opening, payment verification/reconciliation and the final
appointment refresh before navigation. Service stage callbacks affect presentation
only; verified capture remains the confirmation authority. A View cover avoids
opening a second native Modal over Razorpay. Delayed response and failure cleanup
are host-tested; native checkout presentation still needs device verification.

Patient, Doctor and Facility projections expose `confirmation_payment_pending`.
Staff see **Awaiting patient payment**, with no Accept action. Patient can resume a
valid reservation through **Complete payment** in My Bookings/Appointment Details.
`20261026140139_pay_before_auto_confirmation.sql` was deployed to the linked test
backend on 2026-10-26 after rollback verification. Native checkout/device checks
remain separate from SQL/provider mocks. Existing gateway functions handle the
new reservation flow without changes to keys, test/live mode or payout settings.
The three new public booking RPCs intentionally use the existing authenticated
definer API pattern over private tables; their authenticated-execution advisor
notices were reviewed. Anonymous execution and direct execution of the private
booking implementation are revoked, with patient ownership checked server-side.

## Where to get and keep keys

1. In Razorpay Dashboard select **Test Mode**, then **Account & Settings → API Keys
   (under Website and app settings) → Generate Key**. Securely save the generated
   Key ID and Key Secret; the secret is not displayed again. See
   [Razorpay API keys](https://razorpay.com/docs/payments/dashboard/account-settings/api-keys/).
2. From the repository root, copy the placeholder file:

   ```powershell
   Copy-Item -LiteralPath 'supabase/functions/.env.example' -Destination 'supabase/functions/.env.local'
   ```

3. Edit ignored `supabase/functions/.env.local`:

   ```dotenv
   RAZORPAY_KEY_ID=rzp_test_REPLACE_ME
   RAZORPAY_KEY_SECRET=REPLACE_ME
   RAZORPAY_WEBHOOK_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET
   RAZORPAY_MODE=test
   RAZORPAY_LIVE_ENABLED=false
   RAZORPAY_ROUTE_ENABLED=false
   RAZORPAY_ROUTE_LIVE_ENABLED=false
   ```

   Generate the webhook secret separately from the API Key Secret. Use the same
   webhook secret here and in Razorpay's webhook settings. Optional
   `RAZORPAY_ACCOUNT_ID` restricts the merchant account; optional
   `RAZORPAY_WEBHOOK_SECRET_PREVIOUS` supports rotation.

4. Upload to the intended project's Edge Function Secrets:

   ```powershell
   pnpm supabase secrets set --env-file supabase/functions/.env.local --project-ref enjafragbcrrgaclwopd
   ```

   Alternatively enter the same variables in Supabase Dashboard → Edge Functions →
   Secrets. Never put secrets/server credentials in `EXPO_PUBLIC_*`, `NEXT_PUBLIC_*`,
   client source or committed files. Key ID returns dynamically from authenticated
   checkout; Patient needs no Razorpay environment variable. Do not paste real keys
   into chat or documentation.

## Webhook and server setup

Deploy both reviewed payment migrations and the three updated functions to the intended project
before configuring webhook delivery or enabling payments. Review pending migrations
first; avoid applying unrelated migrations. After database deployment:

```powershell
pnpm supabase functions deploy process-payment --project-ref enjafragbcrrgaclwopd
pnpm supabase functions deploy razorpay-webhook --project-ref enjafragbcrrgaclwopd
pnpm supabase functions deploy payment-reconcile --project-ref enjafragbcrrgaclwopd
```

| Endpoint            | Authorization and responsibility                                                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `process-payment`   | `auth: "user"`; checks appointment access, prepares/verifies checkout, reconciles status and processes staff-approved refunds.                                  |
| `razorpay-webhook`  | `auth: "none"`, gateway JWT check disabled; verifies raw-body signature before parsing, requires event ID, fetches provider state and deduplicates events.      |
| `payment-reconcile` | `auth: "secret"`, gateway JWT check disabled; trusted server worker processes durable pending work, using a server-only Supabase secret in the `apikey` header. |

After deployment add a **Test Mode** Razorpay webhook at:

```text
https://enjafragbcrrgaclwopd.supabase.co/functions/v1/razorpay-webhook
```

Set the shared webhook secret and select `payment.authorized`, `payment.captured`,
`payment.failed`, `order.paid`, `refund.created`, `refund.processed` and
`refund.failed`. Verification uses the untouched request body. Configure automatic
capture in Razorpay; this implementation does not run manual capture. See the
[React Native Android integration steps](https://razorpay.com/docs/payments/payment-gateway/react-native-integration/standard/integration-steps-android/)
and [webhook setup](https://razorpay.com/docs/payments/dashboard/account-settings/webhooks/).

A trusted scheduler/operator must invoke `payment-reconcile` with a Supabase server
secret (`sb_secret_...`), never a client publishable key. No scheduler is installed
by source presence or function deployment. App refresh reconciles one appointment;
authorized staff can process/reconcile refunds manually. Configure and monitor the
server worker before relying on unattended processing. The durable queue rotates
work by `last_checked_at`, so repeatedly unresolved entries do not monopolize the
next batch.

## Activation and testing

Billing configuration is a trusted database singleton, not a Patient/reception
setting. Keep it disabled until migration, secrets, functions, webhook and a rebuilt
Patient app are ready. An authorized operator can then enable Test Mode with
reviewed SQL against the intended project:

```sql
UPDATE clinzo.appointment_billing_config
SET enabled = true,
    mode = 'test',
    policy_version = 'consultation-zero-deduction-v1',
    deduction_bps = 0
WHERE singleton;
```

Mode must match the gateway keys. The configuration trigger sets `activated_at`
when switching from disabled to enabled. Only new positive-fee INR online bookings
created at/after that cutoff automatically require payment. Earlier bookings retain
their existing flow unless a voluntary charge exists; any existing charge retains
its own balance checks. Disabling and re-enabling creates a new cutoff, so review
existing unpaid bookings before toggling this operational switch.

Before live activation, verify in Test Mode:

- Captured checkout; tampered signature, order, amount, currency and access denial.
- Authorization without capture, failed/closed Checkout, app restart, missed webhook
  and repeated/out-of-order delivery.
- Paid replacement, top-up, surplus refund, unavailable time and concurrent refund
  versus move without double spending; doctor fault must have zero deduction.
- Full/partial gateway refund, rejected request, lost provider response and worker
  reconciliation; clinic cash received and separately confirmed cash return.
- Unauthorized queue-only staff, unrelated patients and family/delegate access.
- Latest Patient/Doctor/Portal clients, native Android/iOS Checkout and cross-device
  updates. Host tests do not establish native or provider coverage.

Live mode needs explicit owner authorization, the activated merchant account,
reviewed policy and successful provider/device tests. Change database mode and
provider keys together. Server also requires `RAZORPAY_MODE=live` and
`RAZORPAY_LIVE_ENABLED=true`. Existing test charges cannot be processed as live
charges. Change the zero deduction only under a separately approved policy and new
policy version shown before payment acceptance.

## Reconciliation limits and operations

Unfinished online attempts stop blocking recovery after their original booked end
only when reconciliation finds no authorized/captured payment and the provider
still reports an unpaid order. A late verified capture is still credited to the
same appointment chain. Unused credit remains refundable after care is complete;
that does not reopen cancellation refunds for completed care. Clinic/staff
cancellations without a patient cancellation actor have no deduction.

An uncertain order/refund response is never blindly POSTed again. Durable work
retains its receipt; reconciliation searches provider records by receipt and
validates the result. Lookup is bounded to ten pages of 100 records. If the operation
falls outside that window or is not found, an operator must investigate provider
records and the saved receipt before further financial action. Automatic reset or
re-POST could duplicate a charge/refund and is not offered.

Closing Checkout does not cancel the provider order. Refresh before retrying;
unresolved active orders may block cash, another checkout, reschedule or refund.
Manual resolution of a confirmed abandoned/failed order remains an operational
limitation. Reconcile external Dashboard refunds before reusing the balance. Refund
timing follows verified provider state; no settlement date is invented.

## Owners and verification

- Validation/INR display: `packages/contracts/src/appointment-payments.ts`.
- Authenticated calls: `packages/data-access/src/clinic/payments.ts`.
- Billing schema, locks, policy snapshots, audit and online guards:
  `supabase/migrations/20261024061251_appointment_razorpay_billing.sql`.
- Provider HTTPS/HMAC and durable operations: `supabase/functions/_shared/razorpay.ts`
  and `appointmentPayments.ts`; endpoints are listed above.
- Patient: appointment `components/AppointmentPayment.tsx` and
  app-wide `src/services/paymentCheckout.ts`. Doctor and Portal own their `AppointmentPaymentPanel`;
  Portal mutations belong to `server/paymentActions.ts`.

The complete billing SQL workflow passed against the linked schema with the new
migration applied only inside an outer `BEGIN`/`ROLLBACK`. Coverage included
authorization versus capture, duplicate capture/out-of-order failure, blocked moves
during pending checkout, higher-fee top-up, lower-fee surplus return, cancellation
refund split across captured receipts, doctor-fault zero deduction, idempotent cash
receipt/return, unauthorized actors and grants. Existing recovery SQL checks also
passed with billing disabled. All transient schema and fixture changes rolled back;
these checks did not deploy the migration or create retained charges.

Provider-mock checks passed 8/8, clinic/data-access regressions 12/12, Doctor focused
checks 10/10, and Portal checks 43/43 plus architecture validation. Data-access,
Doctor, Facility Portal and Edge TypeScript checks passed again in final verification.
Updated database-model checks passed 5/5. Patient still has its
unchanged `TS18048` baseline in `useAmbulanceBooking.ts:398`. Scoped changed Portal
ESLint passed; full Portal lint retains 43 unrelated errors and one warning.

That initial implementation pass did not run native Checkout, provider calls or
retained money transfers/refunds. Deployment and test credential validation have
since completed as recorded at the top of this guide. Latest app builds and
authenticated cross-device behavior still need testing.

Architecture references: [Patient](apps/patient-mobile/ARCHITECTURE.md),
[Doctor](apps/doctor-mobile/ARCHITECTURE.md),
[Facility Portal](apps/facility-portal/ARCHITECTURE.md),
[shared packages](packages/ARCHITECTURE.md) and
[Edge Functions](supabase/functions/README.md).

## Company commission, recipients and Route payouts

Company Admin `/payments` owns finance setup and the paginated private ledger.
`features/payments` keeps its forms, display constants, guarded server loader and
Server Actions together. Access requires both the existing confirmed company
reviewer identity and an active `clinzo.company_finance_member` row. The migration
grants finance membership to nobody. After deployment, an authorized operator must
confirm the intended Supabase Auth user maps to the correct enabled
`clinzo.identity` and confirmed `clinzo.company_reviewer`, then explicitly insert
that identity ID into `clinzo.company_finance_member`. Do not infer permission from
an email address, reviewer page access or possession of an account.

After verifying that mapping and authorizing this specific grant, use trusted SQL
with the confirmed `clinzo.identity.id` (not the Auth user UUID):

```sql
INSERT INTO clinzo.company_finance_member (identity_id)
SELECT i.id
FROM clinzo.identity i
JOIN clinzo.company_reviewer r ON r.identity_id = i.id AND r.active
JOIN auth.users u ON u.id::text = i.subject
WHERE i.id = '<CONFIRMED_CLINZO_IDENTITY_UUID>'::uuid
  AND i.issuer = 'supabase'
  AND i.disabled_at IS NULL
  AND (u.banned_until IS NULL OR u.banned_until < now())
  AND ((u.email IS NOT NULL AND u.email_confirmed_at IS NOT NULL)
    OR (u.phone IS NOT NULL AND u.phone_confirmed_at IS NOT NULL))
RETURNING identity_id;
```

Confirm exactly the intended identity is returned. No returned row means the
prerequisites were not met; investigate rather than broadening the grant.

Finance sets separate appointment and ambulance commissions in basis points
(0–10000; 100 basis points is 1%) and a release delay of 0–168 hours. Blank rates
remain unconfigured, including when payouts are enabled. The ledger snapshots the
recipient and commission for each captured receipt. Later settings apply to future
receipts. `apply_terms` fills only missing recipient/rate fields on an unconfigured
entry; it cannot replace existing terms or rewrite payout history. Adding a new
recipient retires the old recipient for future selection. Pending payments tied to
the retired recipient stop until finance resolves their configuration; automatic
rebinding to the new payee is not implemented.

Onboard the legal payee through Razorpay Dashboard and finish its required KYC and
Route product activation there. Company Admin stores the legal name, scope/payee
selection and provider `acc_...` / `acc_prd_...` identifiers; it does not collect
bank credentials or recreate KYC forms. Select the doctor or facility for a
practice, or the driver or operator for a driver scope, according to the actual
business agreement. The server fetches and verifies activated Route product status
and accepted terms before a fresh transfer. Entering an ID does not verify a payee.

Route shares the server-side Razorpay Key ID/Secret used for checkout. Keep
`RAZORPAY_ROUTE_ENABLED=false` and `RAZORPAY_ROUTE_LIVE_ENABLED=false` during setup.
Fresh transfers require enabled matching database configuration, configured rates
and a verified active recipient, plus `RAZORPAY_ROUTE_ENABLED=true`. Live transfers
also require `RAZORPAY_ROUTE_LIVE_ENABLED=true` and the existing live payment gates.
Enable them only after Razorpay approves the merchant's Route eligibility, secrets
and database settings agree, and provider/device checks pass. Care completion and
the configured release delay must both pass before transfer; there is no automatic
advance payout. Delayed release remains subject to provider settlement approval,
and no settlement date is promised.

Company commission is gross revenue. The current split leaves raw gateway/Route
fees and taxes with the company; it is not a net-profit calculation. GST invoicing
and TDS automation are not implemented. Doctor and Facility payment panels show
their authorized split, recipient and payout status through `list_payout_entries`.
Driver Earnings pages through the driver's actual ledger, separately from trip
history; the paid amount and company/provider shares are not invented from trips.

For cash, the clinic/driver confirms the amount actually received. This creates a
company commission receivable; it does not split physical cash, debit the collector
or send a Route transfer. Finance separately confirms commission actually received
using a unique receipt reference and note. Historical cash receipts remain visible
after billing is disabled. Closing native Checkout leaves its online order reserved
and blocks cash collection; no cancel-order-to-cash conversion is implemented.

## Ambulance payments and refund boundary

Company finance sets the final INR fare only after the trip completes. There is no
new automated fare formula. Patient reviews the fare in the completion flow or
through `ambulance/payments` and `ambulance/payment/[id]`, then pays using the
shared native checkout adapter. Driver's `trip-payment/[id]` shows billing and can
confirm cash actually received. Payment does not block emergency care, dispatch or
the trip itself. Existing appointment paid credit and rescheduling remain intact.

Ambulance billing extends the existing `clinzo.payment` / `fare_quote` owners, with
a private provider-attempt table. Shared contracts are in
`packages/contracts/src/marketplace-payments.ts`; operations are in
`packages/data-access/src/ambulance/payments.ts` and `clinic/payouts.ts`. Patient's
native SDK owner is now `apps/patient-mobile/src/services/paymentCheckout.ts`,
shared by appointment and ambulance callers.

Appointment refund processing reverses transferred provider liability before
returning the patient's money. Refund requests, cash returns and provider returns
retain separate audited states. Ambulance currently reconciles refunds made in
Razorpay Dashboard; there is no self-service ambulance refund request/approval UI.
Finance must investigate any provider refund/reversal requiring manual resolution.

`_shared/marketplacePayouts.ts` owns Route transfers/reversals;
`_shared/ambulancePayments.ts` owns ambulance gateway processing. Transfer and
reversal POSTs are claimed once. An uncertain result is reconciled by GET using
saved IDs/notes, with bounded pagination (20 pages of 100 for Route lookups).
There is no automatic POST replay or failed retransfer. If lookup never finds the
operation, finance must investigate provider records before any further movement.
Configure applicable provider transfer events on the existing signed webhook and
run the trusted reconciliation worker; neither scheduling nor Route activation
comes from source presence.

## Marketplace verification boundary

Provider/security mocks passed 14 checks. Appointment billing, canonical ambulance
and marketplace SQL smoke suites passed together with both new migration
definitions applied transiently inside one outer transaction and rolled back.
The runner is:

```powershell
powershell -ExecutionPolicy Bypass -File packages/database/tooling/verify-marketplace-payments.ps1
```

It defaults to a local development backend and transiently applies the three payment
migration definitions. Use that default mode only where they are not yet applied.
Explicit `-Linked` selects the linked backend. When migrations are already deployed,
skip migration definitions and test the existing schema with:

```powershell
powershell -ExecutionPolicy Bypass -File packages/database/tooling/verify-marketplace-payments.ps1 -Linked -DeployedSchema
```

Both modes use an outer rollback, retain no fixture rows and make no deployment or
migration-history update. Never use the default mode to redeploy applied migrations.
The deployed-schema mode starts the fixture with billing disabled only inside its
transaction; the active backend configuration and activation cutoff are restored
by rollback.

These checks establish database rules and mocked provider behavior only. Native
Checkout, authenticated browser/mobile payment flows and actual Route
transfers/refunds remain unverified. A read-only test API request and deployed
endpoint probes passed; current deployment is recorded above. Earlier verification counts
above describe the consultation billing pass; they are not the final marketplace
verification totals.

Final marketplace source verification: the 14 payment/provider mocks, 8 selected
mobile structure/live-update checks and 7 Company Admin checks passed. Doctor,
Driver, Company Admin, Facility Portal, data-access and Edge TypeScript checks
passed; changed Company Admin/Portal ESLint and declaration spacing passed.
Database model checks passed 5/5. Broader checks retain these unrelated failures:
Patient `useAmbulanceBooking.ts:398` (`TS18048`), database
`clinic.integration.test.ts:160` (`TS18048`), the existing recovery smoke fixture's
missing explicit transaction wrapper in the backend structure test, and Company
Admin `verification-case-screen.tsx:180` (`react/no-unescaped-entities`).

Synthetic Company Admin desktop (1440px) and mobile (390px) surface captures are
in `.impeccable/review/payout-desktop.png` and `payout-mobile.png`. Both were opened
and inspected without horizontal overflow. They render the actual payment screen
and token CSS with fixture data and a presentation-only form stand-in, so they do
not establish authenticated actions, pending/error behavior or native layout.
The source review's three findings were scored resolved: paid cash history stays
visible after disabling collections, active gateway orders do not suggest cash,
and a zero provider share displays no transfer due. That verdict covers those
three corrections only, not a whole-product visual approval.

## Payment UI refinement and modal replacement

Patient consultation/ambulance payments, Doctor payment management and Driver
trip payments/earnings now compose shared themed receipt layouts. Amounts align
with their labels, payment status remains distinct from appointment/trip status,
and references remain selectable in full. Expandable terms and receipt details
reduce repeated content without moving financial state into shared UI. Patient
refund requests show the amount, deduction, returned amount and reason in a modal.
Facility Portal uses the corresponding shared web receipt presentation; Company
Admin keeps its ledger and finance forms with responsive grouping and larger fields.
No commission, gateway, refund or authorization rule changed in this UI pass.

All three app-owned native alerts (Patient address, driver contact and unavailable
trip location) now use `AppDialog`. Facility Portal's Hold/Reject browser prompt
uses the existing web `Dialog`, preserving the required reason and versioned action.
OS permission/share surfaces and Razorpay's Checkout remain system/provider owned.
No app-owned `Alert.alert`, `Alert.prompt`, browser `alert`, `confirm` or `prompt`
calls remain in app source.

UI verification: 18 shared mobile contract checks and 14 payment/provider mocks
passed. Company Admin's 7 checks and Facility Portal's original 43 checks passed;
the additional reason-modal lifecycle check verifies cancellation, blank reasons,
pending dismissal, retained error drafts and unchanged mutation arguments. Doctor,
Driver and both web typechecks passed; Patient retains the existing
`useAmbulanceBooking.ts:398` type error. The broader mobile structure check retains
Doctor's pre-existing `RecoveryIntent` type placement finding.

Current synthetic web captures are `.impeccable/review/company-payment-1440.png`,
`company-payment-390.png`, `company-payment-320.png` and the matching
`facility-payment-*.png` files. They render actual screen/panel code and token CSS
with fixture data and mocked reads/actions (Company forms use a presentation-only
stand-in). All widths fit without horizontal overflow. These captures do not
verify authenticated actions or native rendering. Device modal/keyboard behavior,
native Checkout and real gateway transfers remain unverified. The payment backend
has since been deployed and consultation test billing enabled as recorded above.
