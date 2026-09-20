# Web admin architecture

The admin uses Next.js App Router with feature-based modules. Routes compose
features; features own business UI and admin-specific server operations. The
existing static dashboard is preserved at `/` and is the first example of this
structure. Other feature folders are reservations for future screen requirements.

## Folder ownership

| Folder | Responsibility |
| --- | --- |
| `src/app` | Next.js routes, layouts, metadata, loading and error boundaries |
| `src/app/page.tsx` | Thin adapter for the existing home page |
| `src/app/(admin)` | Reserved for future admin routes and their shared layout |
| `src/app/(auth)` | Reserved for authentication routes; no login screen yet |
| `src/features/dashboard` | Existing dashboard screen and future dashboard operations |
| `src/features/auth` | Future login/session-facing UI |
| `src/features/doctors` | Future doctor administration |
| `src/features/appointments` | Future appointment administration |
| `src/features/dispatch` | Future ambulance dispatch operations |
| `src/features/facilities` | Future clinic/hospital administration |
| `src/features/staff` | Future staff membership and permissions UI |
| `src/components` | Admin-only UI shared across features, such as navigation |
| `src/server/auth` | Future server-side identity, membership and permission checks |
| `src/server/supabase` | Future request-scoped server client configuration |
| `src/server/observability` | Future server logging and instrumentation |
| `src/lib` | Small cross-feature helpers and future browser client configuration |
| `src/providers` | Client providers, added only when an integration needs them |

Route groups do not add URL segments or enforce authentication. The dashboard is
still public, its metrics are demo values, and its controls remain placeholders.
There are no backend connections, authorization guards, or new screens in this
scaffold. Empty folders are tracked with `.gitkeep`, not fake implementations.

## Adding a feature

Use this shape as needed; do not create unused abstraction layers:

```text
features/appointments/
  screens/AppointmentsScreen.tsx
  components/AppointmentTable.tsx
  server/queries.ts
  server/actions.ts
  hooks/
  types.ts
  tests/
```

Keep `page.tsx` thin: parse route/search parameters, invoke an authorized query
when needed, and compose the feature screen. Server Components are the default;
use `"use client"` only for interactive components. Add route loading/error states
when asynchronous operations exist and their screen requirements are known.

Keep server queries and mutations in the feature's `server` directory. Before
implementing these modules, install and use `server-only` guards. Actions must
validate inputs and check authorization themselves. Do not export server modules
through a barrel also consumed by Client Components. Use Server Actions for web
mutations and Route Handlers only when an HTTP interface is needed.

## Dependency boundaries

- Routes import features and shared code; features never import routes.
- Features own their components, hooks, local validation and display types.
- Avoid cross-feature internal imports. Extract deliberately shared code instead.
- `src/components` contains presentation shared across admin features; generic
  reusable primitives belong in `@startup/web-ui`.
- `@startup/design-tokens` owns visual tokens for web and mobile.
- `@startup/contracts` owns portable shared domain contracts and input validation.
- `@startup/data-access` owns generated database types and genuinely reusable
  operations that receive an app-configured client. It must not own Next.js cookie
  handling, React hooks, providers, or server credentials.
- Shared packages never import applications. Keep platform-specific session/client
  setup in the app. The contracts and data-access packages are currently empty and
  are not dependencies of web until integration begins.

These ownership rules are documented conventions; ESLint currently provides the
standard Next.js/TypeScript rules, not a complete dependency-boundary checker.

## Backend integration contract

The shared backend scaffold lives at the repository root in `supabase/`.
Initialize and configure it in a separate backend integration change.

1. Model organizations, facilities and staff memberships before connecting admin
   data. A future route such as `/facilities/[facilityId]/appointments` selects a
   facility but does not grant access to it.
2. Validate identity and facility membership server-side for every protected
   operation. Enforce database row-level policies as well. Layout redirects are
   for navigation and cannot replace authorization.
3. Configure cookie-based web authentication with distinct browser and
   request-scoped server clients. Never put privileged credentials in browser
   modules or public environment variables.
4. Shared booking/dispatch state transitions belong in authorized, atomic backend
   operations used by all apps. Include idempotency where requests may be retried.
5. Record actor, facility, operation and timestamp for administrative mutations.
   Avoid sensitive medical data in application logs.
6. Paginate queries, select only required fields, and scope subscriptions to
   authorized data. Cache keys must include relevant identity/facility scope;
   never share user-specific responses through a public cache.

## State ownership

Use URL search parameters for shareable filters, sorting and pagination. Keep
ephemeral UI state in local React state. Add a query cache only for client-side
server-data needs such as live dispatch; do not copy fetched entities into another
global store. Add providers and dependencies when required by a real feature.

## Verification

Run from the monorepo root using its pnpm toolchain:

```sh
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web build
```

Typechecking first generates current Next.js route types. A production build can
require network access for the existing Google fonts. This scaffold adds no test
runner; add behavior tests with the first implemented workflows, including
unauthenticated access, denied facility access and failed mutations. Database
policies and transaction constraints require integration tests in
`supabase/tests/database` before backend rollout.
