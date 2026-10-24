# Shared package ownership

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

## Upcoming functionality

The locations below describe future ownership, not implemented payment endpoints.
Create each source directory with its first working implementation and tests.
Do not reserve future features with empty files, folders or `.gitkeep` markers.

| Responsibility                                                           | Owner when implemented                                                                                                                    |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Payment/refund inputs, money values, states and response schemas         | A `contracts` payment domain, shared by all consuming apps                                                                                |
| Reusable authenticated payment backend calls                             | A `data-access` payment domain; UI/query state stays in app feature hooks                                                                 |
| Provider secrets, payment initiation/verification and webhook processing | Server integrations under `supabase/functions`; implement the planned `process-payment` endpoint described in the Supabase function guide |
| Payment persistence and constraints                                      | Extend the existing `database/src/schema/payments.ts` owner and versioned root `supabase/migrations` history                              |
| Patient checkout, facility collection and driver earnings workflows      | Their app-owned payment/booking/earnings features, composed from shared contracts, operations and generic UI                              |
| Reusable payment presentation                                            | `mobile-ui` or `web-ui` only when the component accepts reusable data/callbacks; provider SDK setup remains with its platform integration |

Before adding payments, trace the existing booking, appointment and trip owners.
Payment status must have its own owner rather than being inferred from an
appointment or trip label. Specify amount/currency handling, idempotency, verified
provider events, authorization and retry behavior with the working implementation.
Existing payment UI or database models do not establish a functioning payment
integration. This structural cleanup does not enable payments or change booking
transitions.

The same rule applies to reservations, refunds, dispatch and other upcoming work:
extend an existing domain where it owns the responsibility; create a separate
domain only for a distinct working implementation. Record integration plans here
until code is actually introduced.

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
