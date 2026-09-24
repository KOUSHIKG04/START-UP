# Shared client data access

Use this package from all apps for Supabase operations. It contains a client
factory, the typed public directory RPC, phone onboarding, clinic
booking and scoped inventory adapters. The proposed RPCs require pending migrations
on the linked development project. There are no Drizzle imports,
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
live clinic routes to the clinic RPCs; driver registration connects to onboarding.
Other legacy screens remain demos and must not be treated as backend records.

The database.types.ts file is a bootstrap RPC contract. Replace it with generated
public-schema types after applying migrations (see ../../supabase/README.md).
Queries and mutations accept a client argument; TanStack Query hooks stay in apps.
Input schemas validate before RPC calls and response schemas check JSON projections.
Database RPCs must enforce authorization and transactions again; client validation
is not a trust boundary.
