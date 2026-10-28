# Shared package ownership

## Native toast feedback

`mobile-ui/src/primitives/Toast.tsx` retains the existing `ToastProvider`,
`useToast` and `useToastFeedback` entry points already mounted once in Patient,
Doctor and Driver. Existing callers inherit the stacked design and their app
palette without changing feature queries, routes or mutation feedback. Legacy
`showToast({ title, message, type })` and reference-style calls default to five
seconds for every state, including errors and pending messages. Explicit `lifetime`
overrides remain supported. `toast({ id, message, description, state, action,
lifetime })` supports pending-to-success/error updates using the same ID;
`dismissToast(id)` dismisses one note and omitting the ID retains dismiss-all.

`utils/toast.ts` owns the native event subscription, per-host store and pauseable
clock; `components/ToastCard.tsx` owns measured card layout, status glyphs,
swipe/close/action controls and animation cleanup. The clock pauses during touch,
focus, expanded reading, background state and screen-reader use. Expanded stacks
scroll within the safe viewport. Notes have no progress/countdown bar; swipe and
close dismissal remain available. The clock schedules only the next expiry,
instead of repeatedly rendering a countdown.
Hidden backing cards cannot intercept gestures or accessibility focus. Actions
that replace their own note retain the replacement. No feedback is persisted
across provider unmounts.

Toast headings and descriptions share one copy column with a three-point gap;
close and action controls retain their minimum touch targets.

The [Kobra reference](https://kobra.systems/components/toast) is adapted to native
Views, Animated, PanResponder, I18nManager and AccessibilityInfo. Its DOM/Tailwind,
Base UI direction provider, browser audio listener and CSS blur/dissolve effects
are replaced with native equivalents. Shared light/dark surface and semantic
tokens live in `design-tokens/src/toast.ts`; `colorScheme="dark"` is explicit so a
system dark preference does not conflict with the current light app screens.
The native minimum `LINE_HEIGHT` is 48 rather than 36; controls have at least 44pt
touch targets. A visible close control and a separate action row keep all controls
reachable without compressing the message on small phones. Native fade/scale replaces
the reference's per-letter blur reveal. Copy wraps rather than truncating. Caller `style`/`cardStyle` values
come last, following the native package's conventions; no web global CSS or
browser-only dependencies are added. The requested helper/type exports remain
available from the package's public API.

`primitives/Sound.tsx` provides `SoundEffects`, installed once inside the existing
toast provider. As requested for mobile, it uses `expo-haptics` (already present in
all three apps), only from a real toast control press. Arrival, updates and timer
expiry are silent; `ToastProvider haptics={false}` disables the feedback. Native
press callbacks replace document `data-slot`/`data-sound` delegation.

Focused host tests cover clock/queue transitions, subscription cleanup, own-ID
actions, native controls, style overrides and press-only haptics. Shared/mobile
typechecks and host tests do not verify Android/iOS layout, swipe feel, actual
VoiceOver/TalkBack announcements or tactile feedback; no device was connected for
this implementation. The existing typography fixture expects a 32pt display size
while the current token is 28pt; this unrelated failure remains separate.

Home-visit booking extends `clinic` contracts/operations with a saved location ID;
`prepareAppointmentBooking` selects the home RPC and keeps all payment orchestration
in its existing owners. Backend coverage/snapshot checks live in the existing
home-booking trigger and canonical patient booking function. Appointment projections
carry the booked address to all authorized apps; clients cannot submit a fee,
coverage result or arbitrary coordinates with a booking request.

Follow the root [working rules](../AGENTS.md) and
[repository architecture](../ARCHITECTURE.md). Packages organize reusable
responsibilities; they do not mirror app screens or route groups.

## Current structure

| Package         | Owners                                                                                                                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mobile-ui`     | `primitives` for themed controls, `components` for shared compositions, `layout` for screen shells, `hooks` for UI coordination, `theme` for providers, `types` for reusable UI contracts, `utils` for pure helpers and named configuration            |
| `web-ui`        | `components/ui` for shadcn primitives and their compound components, `components` for custom shared compositions, `hooks` for reusable UI state, `types` for custom component contracts, `lib` for generic helpers, `styles` for the web theme adapter |
| `contracts`     | Domain-named schema/type modules, `utils` for pure cross-app helpers and display mappings, `tests` for contract checks                                                                                                                                 |
| `data-access`   | Domain folders for backend operations, `client` for client factories, `auth` for session/storage adapters, `realtime` for subscriptions, `generated` for wire types, `tests` for adapter checks                                                        |
| `design-tokens` | Token categories in `src`, font assets in `assets/fonts`, CSS generation in `scripts`, contract checks in `tests`                                                                                                                                      |
| `database`      | Trusted client/configuration in `src`, domain models in `src/schema`, development tooling in `tooling`, schema and opt-in database checks in `tests`                                                                                                   |

Use public package exports from consuming apps. Preserve exported names and props
when reorganizing internals. UI packages receive callbacks and presentation data;
they do not import app features, query hooks, backend clients or database models.
State-dependent values stay with the hook or component that owns their inputs.
Small private types, render helpers and compound primitives can stay local.

Client-safe Zod schemas and their inferred types remain together in `contracts`.
Do not duplicate a schema's shape in a separate handwritten interface. Database
wire types and trusted Drizzle models are different layers, not alternate domain
contracts. The handwritten `data-access/src/generated/database.types.ts` overlay
preserves wire compatibility around the generated `supabase.types.ts` output.
Do not regenerate either file as a side effect of a folder cleanup.

## Pay & Book ownership

Booking options/preparation/release extend the existing clinic appointment API.
Contracts keep optional payment-reservation projection fields for compatibility.
The canonical private booking implementation retains the UUID public booking API
while the preparation RPC exposes whether checkout is needed. Existing billing
capture finalizes only valid reservations; shared recovery views keep unpaid
reservations out of consultation and staff-approval actions.

## Manual mobile refresh

`mobile-ui/primitives/PullToRefresh` owns the themed native indicator, an explicit
manual loading state, duplicate-gesture protection, completion after all supplied
requests settle, safe error feedback and unmount cleanup. It accepts a promise or
a group of promises, without importing query clients or backend operations.
`FadedScrollView` accepts an optional `onRefresh`, app theme and indicator offset;
horizontal strips and existing custom refresh controls keep their behavior.
Apps choose which existing queries to refetch. Automatic polling/realtime work
does not activate the manual spinner. Empty/short lists keep the vertical gesture.

## Compatibility and lifecycle

Mobile component modules re-export their moved public types. `CalendarField`
continues to adapt `DatePicker`. Calendar helpers use local `YYYY-MM-DD` values;
their move into `utils` does not change timezone or selection behavior.
`FloatingVideo` retains its own preview refs, effects and gestures at the same
render position in `ConsultationCall`. Keyboard listeners stay in
`useKeyboardAwareScroll`; only their pure geometry helper moved.

The custom web table mounts `useDataTable` once in `DataTable`. Controlled and
uncontrolled sorting/pagination retain their existing defaults and callbacks.
Shadcn compound primitives stay together, with their client directives intact.

`data-access/src/clinic/operations.ts` remains the compatibility export for
practice lookup, sessions/publication, availability, unavailability, appointments
and check-in. Their implementations now live in the corresponding domain files.
RPC names, request/response schemas and mutation arguments are unchanged. App
query keys, invalidation and subscription ownership remain app-local.

`contracts/src/dates.ts` remains a compatibility export; date implementations
live in `utils/dates.ts`. Language mappings live in `utils/languageConstants.ts`.
Compatibility modules must contain re-exports or adapters, not copied logic.

## Appointment recovery integration

`contracts/src/appointment-recovery.ts` owns portable recovery schemas, policy
validation and `appointmentRecoveryView`. Appointment projection fields include
attendance deadline, management permission, replacement lineage, patient move
count and the latest review request. Optional recovery data preserves compatibility
with older appointment responses. Display clocks belong to consuming app hooks;
the pure view derives labels/action eligibility without changing stored attendance.

`data-access/src/clinic/recovery.ts` owns validated operations for listing replacement
times, rescheduling, requesting/deciding reviews, recording attendance and saving
operational policy. Operations receive the app-configured client and use authenticated
RPCs; hooks, query keys, retries and live-update lifecycle stay app-local. The private
request table is exposed only through authorized projections/RPCs. Request changes
update the appointment version and explicitly invoke the existing private
`clinzo.emit_appointment_change` emitter. The incumbent row broadcaster ignores
updates limited to `updated_at`/`row_version`, so a version touch alone is insufficient.
Existing patient, doctor and facility topics carry kind-only cache invalidations;
no public channel or extra app subscription is introduced.

`mobile-ui/src/components/AppointmentRecoveryDialog.tsx` is the Patient/Doctor
presentation owner. It composes existing `ModalSurface`, themed buttons, inputs,
dropdowns, loader and shared tokens. It accepts choices, copy, loading/error state
and callbacks, with local date/time/reason draft state. Scroll, safe-area and keyboard
handling belong to this presentation component; it imports no app feature or backend
client. Facility Portal composes its existing web dialog primitives locally.

The local recovery migration serializes moves using the existing doctor lock and
ordered source/target session locks before appointment/window/queue operations.
Capacity release, replacement reservation, history and queue changes commit together;
an unavailable target rolls back the original release. Same-day moves reuse daily
capacity and keep the original app/reception source. `replaces_appointment_id` retains
lineage with one replacement per source. Staff/doctor-unavailable moves do not consume
the patient's self-service count; other patient moves carry an incremented count down
the chain. Appointment/request/settings versions and move idempotency protect retries.

Practice-wide defaults are 15 minutes of attendance grace, a zero-minute notice
cutoff and one patient move, editable through a separate versioned policy RPC.
Clinic attendance uses session end; other modes use booked end plus grace. No-show
and doctor-unavailable outcomes require explicit authorized decisions. Timers never
complete consultations. An active online consultation remains rejoinable after its
deadline. Final backend/deployment and native verification remain separate from
source and host tests. See the
[recovery and payment boundary](../APPOINTMENT_RECOVERY_PAYMENTS.md).

## Consultation billing integration

`contracts/src/appointment-payments.ts` owns client-safe billing/checkout/command
schemas, INR integer-paise values and `appointmentMoney`. The public package export
is shared by Patient, Doctor and Facility Portal. `data-access/src/clinic/payments.ts`
owns authenticated billing reads, checkout/verification/reconciliation, refund
requests/decisions and cash receipt/return operations. App hooks/components retain
query keys, drafts, invalidation and live-update lifecycle.

Provider credentials, HMAC, HTTPS calls and durable operation processing live in
`supabase/functions/_shared/razorpay.ts` and `appointmentPayments.ts`, consumed by
`process-payment`, `razorpay-webhook` and `payment-reconcile`. Provider SDK loading
belongs to Patient's app-wide `src/services/paymentCheckout.ts`; generic UI packages do not import it.
Doctor/Portal collection and refund panels remain app-owned.

`mobile-ui/src/components/PaymentSummary.tsx` owns presentation-only receipt
layouts, amount rows, payment status, expandable details and selectable references
for Patient, Doctor and Driver. `AppDialog.tsx` composes the existing `ModalSurface`
with themed buttons, safe-area padding, scrollable content and keyboard handling.
Apps retain visibility, drafts, confirmation callbacks and financial mutations.
Its busy state blocks dismissal; custom action slots must disable their own controls.
`web-ui/src/components/payment-summary.tsx` provides the web receipt header and
status label used by Facility Portal and Company Admin. These compositions import
no feature, backend client or provider SDK.

Appointment-specific persistence is in
`supabase/migrations/20261024061251_appointment_razorpay_billing.sql`: configuration,
charge, attempts, refund requests/jobs and event deduplication. Existing ambulance
`clinzo.payment`/`fare_quote` foreign keys are not reused. Private tables deny direct
client access; financial management requires practice and schedule permissions.
Provider HTTP work happens outside the booking transaction. Replacement moves carry
the existing charge under the booking lock; refund reservations and unresolved
provider attempts block conflicting credit reuse. Patient-visible paid state requires
server-verified capture; authorization or Checkout success alone is insufficient.

Existing private appointment events invalidate app-local billing caches. No shared
UI component owns a backend client or secret. The billing integration is deployed
and enabled for consultation testing with zero deduction; live/Route and marketplace
collections remain disabled. Read-only provider and endpoint checks passed, while
native Checkout and real capture/refund flows remain unverified. Setup, key
storage, native rebuilds and reconciliation limits are documented in the
[payment guide](../APPOINTMENT_RECOVERY_PAYMENTS.md).

## Upcoming functionality

Additional reservation and dispatch integrations must
extend their existing owners when appropriate. Existing ambulance models/UI do not
establish live gateway handling. Create directories with their first working
implementation; record future work here instead of empty placeholders. Keep payment
status separate from appointment/trip status, use explicit authorization and verify
provider events before changing financial balances.

## Verification

Run package checks from the repository root:

```sh
pnpm --filter @startup/mobile-ui test
pnpm --filter @startup/mobile-ui typecheck
pnpm --filter @startup/web-ui test
pnpm --filter @startup/web-ui typecheck
pnpm --filter @startup/contracts test
pnpm --filter @startup/data-access test
pnpm --filter @startup/data-access typecheck
pnpm --filter @startup/design-tokens test
pnpm --filter @startup/design-tokens check
pnpm --filter @startup/design-tokens typecheck
pnpm --filter @startup/database test
pnpm --filter @startup/database typecheck
```

Compare failures with the pre-change baseline and typecheck consuming apps after
public API changes. Package host tests do not verify native gestures, camera,
notifications, browser layout or deployed database behavior. Database integration
checks require their existing explicit disposable-environment setup; never apply
migrations or change a linked database just to verify structural extraction.

### Cleanup verification snapshot

The structural pass retained all public export names across the five client-safe
packages and compared all 92 original mobile UI/clinic function bodies with the
saved starting sources. Their bodies are unchanged apart from formatting and
relocation. Database models, generated wire types and token values were not edited.

Mobile UI tests passed 41 of 42 checks; the existing typography expectation
(`32` versus the current `28`) still fails. Web table tests passed 4 checks,
data-access passed 21, contracts passed 12, Doctor consultation checks passed 4 and
database schema contract checks passed 5 outside the sandbox.
The initial token suite also reported two existing CSS/token synchronization
failures; CSS was not regenerated as part of this cleanup.

Typechecks passed for mobile UI, data-access, design tokens, Doctor, Driver,
Facility Portal and Company Admin. Remaining diagnostics are in existing Patient
ambulance code, web calendar/chart/command/drawer code and a database integration
test. The Patient and web UI diagnostics were reproduced against the saved
pre-refactor sources. Sandbox dependency reads initially produced additional
errors; checks with working filesystem access are the meaningful comparison.
Device/browser flows and live backend integrations were not re-verified.

## Backend test ownership

Transactional SQL smoke fixtures live in `supabase/tests/smoke`. The database
package keeps Drizzle schema checks, filesystem contract checks and explicitly
opt-in Bun integration tests. Its trusted verification runner retains the same
interface and disposable-target guards. See [Supabase tests](../supabase/tests/README.md).
Empty schema/function/RLS placeholders have been removed; future integration
requirements live in the [function guide](../supabase/functions/README.md).

## Consultation billing verification

Shared clinic/data-access regression checks passed 12/12, provider mocks 8/8 and
database schema-model checks 5/5. Final data-access typecheck passed. Billing and
recovery workflows passed in rollback transactions,
without establishing hosted deployment or real gateway use. An undeployed billing
RPC (`PGRST202`) returns no billing surface, rather than fabricated financial data.

## Marketplace commission, ambulance billing and Route

`contracts/src/marketplace-payments.ts` owns the client-safe company configuration,
recipient, ledger, ambulance billing and action schemas. Amounts remain INR integer
paise and rates are integer basis points. `data-access/src/clinic/payouts.ts` owns
finance-access checks, authorized payout pagination, setup/configuration commands
and finance Edge invocation. `data-access/src/ambulance/payments.ts` owns ambulance
billing, checkout/status verification and confirmed cash receipt operations.
Consumers use the public package exports; query keys, drafts and refresh lifecycle
stay in the corresponding app features.

The new marketplace migration
`20261024075732_marketplace_commissions_and_route.sql` owns private RLS-protected
finance membership, configuration, recipients, provider attempts, payout entries,
reversals and cash commission receipts. It extends canonical ambulance
`clinzo.payment` / `fare_quote`, while appointment charges retain their separate
owner. Ledger reads enforce finance, practice financial permission or the driver's
own identity. Finance membership also requires the existing confirmed reviewer;
nobody receives it automatically. Per-capture recipient/rate snapshots cannot be
rewritten by later settings; `apply_terms` only fills missing fields.

Server-only `_shared/ambulancePayments.ts` and `marketplacePayouts.ts` coordinate
gateway state and Route. Legal payees complete KYC/Route activation in Dashboard;
the company app stores legal scope/name and provider identifiers, never bank
credentials. Fresh transfers verify product activation and require completed care,
the configured delay and explicit database/server activation. Cash records company
commission receivable, with separate unique finance receipts rather than automatic
cash debits. Appointment refunds reverse transferred provider liability first;
ambulance only reconciles refunds initiated in provider Dashboard.

The two payment migrations, the ambulance worker alias follow-up migration and
all three payment Edge Functions were deployed on 2026-10-24 with user approval.
Consultation test billing is enabled; marketplace collections and Route remain
disabled with unconfigured commission rates. Provider/security mocks
passed 14 checks, and all billing, canonical ambulance and payout SQL smoke suites
passed in a single outer rollback. `database/tooling/verify-marketplace-payments.ps1`
defaults to local development; explicit `-Linked` selects the linked backend. It
transiently applies all three migration definitions by default, so use that mode
only where they remain undeployed. Use `-Linked -DeployedSchema` to test the current
linked schema without replaying DDL. Neither mode changes migration history or
retains fixture rows. Read-only provider and endpoint checks passed; native UI,
actual captures/refunds and Route transfers remain unverified. See
the [payment guide](../APPOINTMENT_RECOVERY_PAYMENTS.md) for complete setup/limits.
