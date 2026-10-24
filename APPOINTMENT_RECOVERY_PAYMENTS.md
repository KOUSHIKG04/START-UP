# Appointment recovery and future payments

## Scope and current integration boundary

Attendance recovery and rescheduling are implemented independently of money.
The current changes do not collect payments, create credit balances, issue refunds,
deduct fees or call a payment provider. The runtime recovery request kinds are
`reschedule` and `review`; there is deliberately no fake refund endpoint or button.
Gateway operations must remain disabled until the integration below is completed
and explicitly enabled by the project owner.

The existing `clinzo.payment` and `fare_quote` models belong to ambulance bookings.
Do not attach a doctor appointment to an ambulance booking or reuse those foreign
keys to represent consultation payments. Extend the billing domain with real
appointment-specific models when integration starts. No speculative payment code
or empty service directories have been created.

## Implemented appointment flow

- Time passing flags attendance for review; it never marks a consultation complete.
- Unaccepted requests become an expired display state. Stored history is retained.
- Clinic attendance uses the session end, not only the booked window. Checked-in
  patients remain visibly waiting until staff decide the attendance outcome.
- Online confirmed visits use the configured grace period after the booked end.
  An active consultation may still be rejoined and signed after that deadline.
- Authorized doctor/reception staff may confirm patient no-show or record doctor
  unavailability. These are separate outcomes, with actor, time and reason retained.
- Patients can choose a replacement for the same practice, visit mode and service.
  Eligible early changes commit directly; late changes and no-shows request review.
  Requested times are not reserved until approval and may become unavailable.
- Staff can approve/decline a request, resolve an attendance review, or arrange a
  replacement time. A resolved review does not itself decide attendance or money.
- Original appointments keep their original IDs/times. Replacements use the existing
  `replaces_appointment_id` relationship; the original displays `Rescheduled`.
- Moves take the existing doctor lock, then lock source/target sessions in ID order.
  Validation, release, reserve,
  queue update and history commit together. A failed new reservation rolls back the
  original release. Same-day moves reuse one daily quota place and keep the source
  channel, so reception cannot consume the app allocation or vice versa.
- Confirmed appointments remain confirmed; unaccepted appointments remain pending.
  New clinic arrivals get a fresh queue ticket; old arrival/QR state is not copied.
- Idempotency keys protect successful moves and late reschedule requests against
  retries. Optimistic versions protect decisions and settings from stale edits.
- Recovery request/decision changes explicitly use the existing private appointment
  emitter after updating the appointment version. Existing Patient/Doctor/Facility
  subscriptions receive kind-only invalidations; a timestamp/version touch alone
  is suppressed by the incumbent row broadcaster. No public channel is added.

## Editable operational policy

The existing schedule preferences own these practice-wide fields. Doctor Schedule
and Facility Doctor Schedule expose a separate versioned Save recovery policy action.

| Field                   | Initial value | Allowed values  | Meaning                                       |
| ----------------------- | ------------- | --------------- | --------------------------------------------- |
| Online attendance grace | 15 minutes    | 0-180 minutes   | Extra time after the booked end before review |
| Self-reschedule cutoff  | 0 minutes     | 0-10080 minutes | Minimum notice before the original start      |
| Self-service moves      | 1             | 0-10            | Patient-initiated moves per replacement chain |

Staff-arranged moves and doctor-unavailable recovery do not consume the patient's
self-service allowance. A zero self-service allowance disables direct patient moves;
the patient may still report an attendance problem for staff review. These are
operational defaults, not a paid cancellation/refund policy.

## Payment policy to decide before launch

No deduction percentage has been selected or activated. The 10% example discussed
with the user is illustrative, not an approved default.

| Case                           | Proposed eligibility             | Money treatment to confirm                                  |
| ------------------------------ | -------------------------------- | ----------------------------------------------------------- |
| Patient changes before cutoff  | Self-service reschedule          | Carry eligible paid amount; no default deduction            |
| Patient misses the visit       | Staff review                     | Approved credit or partial refund under the accepted policy |
| Doctor cancels/does not attend | Recovery without patient penalty | Full eligible credit or full refund                         |
| Technical/attendance dispute   | Review before financial action   | No automatic deduction                                      |

Before accepting paid bookings, configure the cancellation cutoff, number of free
moves, approval rules, credit expiry/transfer limits, deduction percentage or fixed
amount, tax treatment and exceptional-case authority. Review the proposed policy
for the deployment's consumer, healthcare and payment obligations. Show and record
the accepted policy version before payment; never silently apply a later financial
policy to an earlier payment.

## Financial data and lifecycle

Add appointment invoice/charge, provider payment attempt, captured receipt, credit
allocation, refund request and provider refund/outbox records in the existing billing
schema owner. Use integer minor units with currency on every amount; never floats.
Keep payment, appointment, review and refund statuses separate.

Required invariants:

1. Only server-verified capture can establish a paid balance. A client success screen
   or checkout return URL is not proof of payment.
2. Available credit = captured amount minus refunds, applied credits and authorized
   deductions. Refunds and replacement credits cannot both spend the same balance.
3. Reserve a replacement and its credit allocation in one database transaction.
   A failed move leaves the old booking/payment allocation intact.
4. Preserve provider payment IDs and source invoice links across the replacement
   chain. Never represent a move as a new successful charge without a real capture.
5. If the new fee is higher, show the exact top-up before confirmation. If it is lower,
   show the agreed credit/refund treatment. Mixed currencies require a separate flow.
6. Refund approval enqueues a durable provider operation; it does not mean the money
   was returned. Provider processing happens outside the booking database transaction.
7. Use unique idempotency keys for payment attempts, credit allocations and refunds.
   Verify webhook signatures and deduplicate provider event IDs. Support late and
   out-of-order events without double refunds or duplicate booking replacement.
8. Record decisions, policy snapshots, deduction basis, actor and provider reference
   for audits. Staff roles need explicit financial permissions, not merely queue access.

Suggested refund states: requested -> approved -> processing -> refunded, with
separate rejected/failed states and a reconciliation/retry path. Patient copy must
distinguish each state and show refund amount, deduction, original payment method,
provider reference and provider-supported timing when known. Do not invent timelines.

Example only: captured INR 50000 minor units, authorized deduction 5000, proposed
refund 45000. Before confirmation display Paid ₹500, Deduction ₹50, Refund ₹450.

## Future UI connections

Patient actions should offer Reschedule using paid amount or Request refund when
their verified financial state and accepted policy permit them. Refund confirmation
shows the complete calculation before submission. Never refund and also carry the
same amount into a replacement. Doctor/facility views show attendance evidence,
original charge, available credit, requested outcome and decision history.

The current reschedule RPC does not transfer paid money. Before turning on paid
consultation checkout, extend it with verified billing locks/allocations, fee-difference
approval and the provider outbox. Do not enable paid bookings against the present
reschedule implementation and assume the payment is carried automatically.

## Activation checklist and tests

- Integrate the selected provider through the planned `process-payment` Edge Function
  owner; keep credentials server-only and route webhooks through signature verification.
- Add private billing tables/RLS and explicit capture, refund and financial-permission
  checks. Preserve existing Patient/Doctor/Facility booking and queue contracts.
- Test full/partial refunds, credit-only moves, fee differences, repeated requests,
  retries, webhook order, expired slot holds, failed approvals and reconciliation.
- Race reschedule vs refund vs cancellation; prove the balance cannot be spent twice.
- Test unauthorized patient/staff access, family/delegate access, policy snapshots,
  unavailable target slots and that doctor fault never triggers a patient deduction.
- Run sandbox end-to-end payment/capture/refund checks, then get explicit owner
  authorization before configuring production credentials or enabling real money.

## Implementation owners and verification

Shared rules/contracts: `packages/contracts/src/appointment-recovery.ts`.
Operations: `packages/data-access/src/clinic/recovery.ts`.
Backend: `supabase/migrations/20261023075921_appointment_recovery_and_rescheduling.sql`.
Workflow fixture: `supabase/tests/smoke/appointment-recovery.cli-smoke.sql`, always
inside an outer BEGIN/ROLLBACK. Application architecture documents track deployment
and device verification separately; source presence is not proof of deployment.

Architecture references: [Patient](apps/patient-mobile/ARCHITECTURE.md),
[Doctor](apps/doctor-mobile/ARCHITECTURE.md),
[Facility Portal](apps/facility-portal/ARCHITECTURE.md),
[shared packages](packages/ARCHITECTURE.md) and
[Edge Functions](supabase/functions/README.md).

The recovery migration passed rollback-only workflow checks against the linked
database, including online and clinic replacement, daily capacity, queue reset,
authorization, private invalidation signals, unavailable approval targets and
lost-response retry after refresh. All test and schema changes were rolled back.
The focused host suite passed 61 tests and the Facility Portal suite passed 43.
Doctor and Facility typechecks pass; Patient has one unchanged baseline diagnostic.
Shared mobile UI typechecks pass. The database package still reports an unrelated
possibly-undefined value in `tests/clinic.integration.test.ts:160`; Portal full lint
still reports existing bed-stepper and older test import findings.

Shared-database deployment requires explicit approval and has not been performed;
automatic approval review rejected the deployment attempt on that basis. Native Patient and
Doctor recovery, keyboard behavior and cross-device updates remain unverified
because no device was attached. Facility desktop and narrow-width component previews
use synthetic data in `.impeccable/review/recovery-desktop.png` and
`.impeccable/review/recovery-mobile.png`; they do not establish authenticated live
workflow coverage.

## Incumbent visual system comparison

Documentation compared `PRODUCT.md`, the shared design-token colors, the existing
app architecture, recovery contracts/operations/migration, mobile recovery dialog,
Facility dialog and Doctor/Facility policy sections. The recovery surfaces extend
the current medical teal system, app themes, shared controls, existing modal/dialog
primitives and schedule sections. No new visual world or token scale was introduced.
The mobile dialog owns scroll, keyboard avoidance and safe-area spacing; the web
dialog keeps the existing dialog's keyboard/focus behavior and adds bounded scrolling.

Root `DESIGN.md` and an appointment-specific design brief were absent when checked.
`PRODUCT.md` still describes the admin as `web`, while the current application owner
is `apps/facility-portal`. Existing Facility schedule controls contain local literal
colors alongside shared theme primitives. These documentation/token consistency gaps
are recorded here without changing visual authority or repairing unrelated surfaces.
