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
