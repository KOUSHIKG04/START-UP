# Web admin architecture

The admin uses Next.js App Router with feature-based modules. Routes compose
features; features own business UI and admin-specific server operations. The
dashboard is available at `/` and `/dashboard`. Appointments and login have their
own feature screens, as do bed management, doctor management and doctor schedules.
Each implemented feature exposes its supported entry points through `index.ts`.

## Folder ownership

| Folder | Responsibility |
| --- | --- |
| `src/app` | Next.js routes, layouts, metadata, loading and error boundaries |
| `src/app/(admin)` | Thin route adapters and one shared admin layout |
| `src/app/(auth)` | Login route adapter, outside the admin shell |
| `src/features/dashboard` | Existing dashboard screen and future dashboard operations |
| `src/features/auth` | Login screen, form component and login constants |
| `src/features/doctors` | Doctor directory, schedules, add-doctor UI, feature hooks, types and constants |
| `src/features/appointments` | Appointment screen, record types, demo rows and filter/summary constants |
| `src/features/dispatch` | Future ambulance dispatch operations |
| `src/features/facilities` | Bed management screen, allocation hook, types and constants |
| `src/features/staff` | Future staff membership and permissions UI |
| `src/components/admin` | Shared admin layout, sidebar and reusable navigation components |
| `src/components/admin/utils` | Shell-owned navigation, brand and demo-user constants |
| `src/server/auth` | Future server-side identity, membership and permission checks |
| `src/server/supabase` | Future request-scoped server client configuration |
| `src/server/observability` | Future server logging and instrumentation |
| `src/lib` | Small cross-feature helpers and future browser client configuration |
| `src/providers` | Client providers, added only when an integration needs them |

Route groups do not add URL segments or enforce authentication. All screens remain
public. Login is presentation only; no session or backend is connected. Dashboard
metrics, appointment rows, date labels, summary totals and pagination are demo
values. The appointment period control changes its selected state but does not
filter real records. Bed counts and doctor search update local state. The add-doctor
form simulates success with a timer; it does not persist or add a doctor to the
directory. No authentication or backend integration is implied by this structure.

| URL | Feature screen |
| --- | --- |
| `/`, `/dashboard` | `dashboard/screens/DashboardScreen.tsx` |
| `/appointments` | `appointments/screens/AppointmentsScreen.tsx` |
| `/bed-management` | `facilities/screens/BedManagementScreen.tsx` |
| `/doctor-management` | `doctors/screens/DoctorManagementScreen.tsx` |
| `/doctor-schedules` | `doctors/screens/DoctorSchedulesScreen.tsx` |
| `/login` | `auth/screens/LoginScreen.tsx` |

The admin shell is mounted once in `(admin)/layout.tsx`, so its sidebar state is
preserved during navigation between admin pages. Do not wrap individual screens
or route pages in a second admin layout. Login has no admin sidebar.

## Adding a feature

Use this shape as needed; do not create unused abstraction layers:

```text
features/appointments/
  index.ts
  screens/AppointmentsScreen.tsx
  components/AppointmentTable.tsx
  server/queries.ts
  server/actions.ts
  hooks/
  types/appointments.ts
  utils/appointmentsConstants.ts
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
- Routes import the feature's public `index.ts`, not its internal screen path.
- Features own their components, hooks, local validation and display types.
- Features do not import other features. Compose workflows at the route boundary:
  the dashboard routes pass the doctors feature's `AddDoctorAction` as a ReactNode
  slot into `DashboardScreen`. The action owns its dialog and client state, while
  dashboard stays a Server Component. Keep feature public exports deliberate.
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

The architecture check runs before ESLint and checks both relative and `@/` imports.
It rejects duplicate route URLs, feature-to-feature dependencies, shared-to-feature
dependencies, route imports into lower layers, route imports of feature internals,
module-level screen data, and hook calls without a client directive. These are
static checks for the current conventions, not a complete runtime dependency audit.

Keep static screen data, filter options, demo dates, summaries and pagination in
the owning feature's `utils/<screen>Constants.ts`. Keep record types in `types/`.
Do not move component state or values computed from props into constants. Shared
navigation belongs to the admin shell, not dashboard or authentication. Generic
component behavior, styling and SVG geometry stay with the component or design
system. Dashboard-only doctor/ward summaries remain in dashboard until another
feature actually needs a shared domain operation.

The shadcn CLI can generate blocks into `src/components` and pages into `src/app`.
After adding a block, move screen-specific forms/UI into the owning feature and
leave a thin route adapter. Keep generic primitives in `@startup/web-ui`.

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
pnpm --filter web check:architecture
pnpm --filter web test:architecture
pnpm --filter web typecheck
pnpm --filter web build
```

Typechecking first generates current Next.js route types. A production build can
require network access for the existing Google fonts. Architecture regression tests
use Node's built-in test runner. Add backend workflow tests when integrating data, including
unauthenticated access, denied facility access and failed mutations. Database
policies and transaction constraints require integration tests in
`supabase/tests/database` before backend rollout.
