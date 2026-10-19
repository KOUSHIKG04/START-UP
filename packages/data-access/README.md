# Shared client data access

Use this package from all apps for Supabase operations. It contains a client
factory, the typed public directory RPC, phone onboarding, clinic
booking, clinical, driver/trip/tracking, and scoped inventory adapters. Local
adapters and migration files do not prove deployment; verify the target environment
before claiming an RPC is available. There are no Drizzle imports,
database passwords, service-role keys, React providers or global session singletons.

```ts
import {
  createSupabaseClient,
  listPublicPractices,
} from "@startup/data-access";
const client = createSupabaseClient(
  projectUrl,
  publishableKey,
  platformOptions
);
const practices = await listPublicPractices(client);
```

Each app declares @startup/data-access as a workspace dependency. Pass platform-specific auth storage/options: Expo persists sessions
with the shared chunked SecureStore adapter; web browser clients use browser
storage. Next.js server rendering requires request-scoped cookie-aware clients
with @supabase/ssr; do not share a server client/session between requests.

All apps use the same Supabase project per environment. Shared adapters send and
verify sign-in OTP through Supabase Auth. Patient and doctor apps connect their
live clinic routes to the clinic RPCs; Driver has onboarding, saved-location,
fleet/profile, offer, trip, and tracking adapters.
Other legacy screens remain demos and must not be treated as backend records.

Generated wire types live under `src/generated`. Regenerate them after applying
schema changes (see ../../supabase/README.md).
Queries and mutations accept a client argument; TanStack Query hooks stay in apps.
Input schemas validate before RPC calls and response schemas check JSON projections.
Database RPCs must enforce authorization and transactions again; client validation
is not a trust boundary.

Follow the root [ownership rules](../../AGENTS.md). Extend existing domain modules
before creating similarly named adapters. The unreferenced empty appointment,
record, and ambulance query/mutation/realtime stubs have been removed. Active
clinic, clinical, ambulance, and realtime implementations remain the owners; inspect
their exports and callers before introducing another module. Query hooks remain
app-local.

## Domain structure

Clinic responsibilities live in `clinic/practices.ts`, `sessions.ts`,
`availability.ts`, `unavailability.ts`, `appointments.ts` and `checkin.ts`.
`clinic/operations.ts` retains its existing exports; apps continue importing from
`@startup/data-access`. This extraction preserves RPC names, input validation,
response parsing, error propagation and mutation arguments.

`generated/supabase.types.ts` is generated wire output. `database.types.ts` is its
handwritten compatibility overlay, not a second schema to edit or regenerate
independently. Other domain folders remain the owners of their current operations.

The test command runs both the existing `.mjs` checks and `.cjs` adapter checks.
Clinic adapter tests exercise booking idempotency arguments, publication, slot
limits, transitions, QR tokens and appointment aggregation without network calls.

See the [shared package ownership guide](../ARCHITECTURE.md) for future payment
ownership. Add reusable payment operations only with a working backend contract;
provider credentials and webhook processing belong in server integrations, and
app query hooks remain in the consuming features.
