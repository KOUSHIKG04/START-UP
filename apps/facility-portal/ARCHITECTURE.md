# Facility portal architecture

The admin uses Next.js App Router with feature-based modules. Routes compose
features; features own business UI and admin-specific server operations. The
dashboard is available at `/` and `/dashboard`. Appointments and login have their
own feature screens, as do bed management, doctor management and doctor schedules.
Each implemented feature exposes its supported entry points through `index.ts`.

## Folder ownership

| Folder                       | Responsibility                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------- |
| `src/app`                    | Next.js routes, layouts, metadata, loading and error boundaries                 |
| `src/app/(admin)`            | Thin route adapters and one shared admin layout                                 |
| `src/app/(auth)`             | Login, signup and facility-verification route adapters, outside the admin shell |
| `src/features/dashboard`     | Dashboard composition, appointment acceptance and live update coordination      |
| `src/features/auth`          | Login/signup UI, action state, logout and server auth actions                   |
| `src/features/doctors`       | Doctor directory, schedules, add-doctor UI, feature hooks, types and constants  |
| `src/features/appointments`  | Appointment screen, record types, demo rows and filter/summary constants        |
| `src/features/facilities`    | Bed management screen, allocation hook, types and constants                     |
| `src/components/admin`       | Shared admin layout, sidebar and reusable navigation components                 |
| `src/components/admin/utils` | Shell-owned navigation, brand and demo-user constants                           |
| `src/server/auth`            | Approved-facility access checks                                                 |
| `src/lib/supabase`           | Request-scoped server client, cookie proxy and public config                    |
| `src/lib`                    | Small cross-feature helpers and browser/server client configuration             |
| `src/providers`              | Existing query provider                                                         |

Dispatch, staff administration and additional observability remain future work.
Their obsolete empty scaffolds have been removed; add folders with implementation.

Route groups do not add URL segments. The admin routes require an authenticated
account with a company-verified facility. Accounts without approval go to
`/facility-verification` to register, submit their registration certificate and
operating licence, or wait for review. Facility RPCs still authorize each
operation by membership; bed inventory also requires a verified facility at the
database boundary. The portal uses email/password Auth with cookie refresh in
`src/proxy.ts`.

| URL                  | Feature screen                                |
| -------------------- | --------------------------------------------- |
| `/`, `/dashboard`    | `dashboard/screens/DashboardScreen.tsx`       |
| `/appointments`      | `appointments/screens/AppointmentsScreen.tsx` |
| `/bed-management`    | `facilities/screens/BedManagementScreen.tsx`  |
| `/doctor-management` | `doctors/screens/DoctorManagementScreen.tsx`  |
| `/doctor-schedules`  | `doctors/screens/DoctorSchedulesScreen.tsx`   |
| `/login`             | `auth/screens/LoginScreen.tsx`                |

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
```

Regression tests live under `tests/unit`; the architecture checker and shared test
tools live under `scripts`. Do not add test files to runtime feature folders.

Keep `page.tsx` thin: parse route/search parameters, invoke an authorized query
when needed, and compose the feature screen. Server Components are the default;
use `"use client"` only for interactive components. Add route loading/error states
when asynchronous operations exist and their screen requirements are known.

Keep server queries and mutations in the feature's `server` directory. Server-only
query entry points use `server-only` guards; action files retain `"use server"`.
Actions must
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
  setup in the app. Contracts and data-access already provide the shared facility,
  appointment, doctor, schedule, verification and notification operations.

Routes can import an explicit feature `server.ts` entry for server operations.
The facilities entry exposes `saveBedInventory` to its HTTP adapter without adding
server code to the client-consumed feature index. The admin route passes the auth
logout component through a slot into the shell; shared sidebar/layout components
do not import an app feature.

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

The shared backend lives at the repository root in `supabase/`. Existing auth,
verification, bed inventory, appointment, directory and scheduling integrations
use the contracts and data-access packages. New integrations follow these rules;
the presence of source code does not establish deployment or browser verification.

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
pnpm --filter facility-portal lint
pnpm --filter facility-portal check:architecture
pnpm --filter facility-portal test:architecture
pnpm --filter facility-portal test
pnpm --filter facility-portal typecheck
pnpm --filter facility-portal build
```

Typechecking first generates current Next.js route types. A production build can
require network access for the existing Google fonts. Architecture regression tests
use Node's built-in test runner. Add backend workflow tests when integrating data, including
unauthenticated access, denied facility access and failed mutations. Database
policies and transaction constraints require backend integration verification.
Existing rollback checks live in `supabase/tests/smoke`; actual pgTAP tests belong
in `supabase/tests/database` when implemented.

## Feature ownership review

See [FEATURE_STRUCTURE.md](FEATURE_STRUCTURE.md) for the complete source review.
Workflow hooks own existing form state, queries, actions and effects. Schedule
controls have individual component owners; `FacilityDoctorScheduleEditor` retains
its practice/type key. The facility verification hook mounts once and passes the
address section its existing draft and callbacks. Map library loading stays a
singleton browser service; map listeners and cleanup stay in the map hook.
`doctorApi` is a feature client service, while query/cache behavior stays in hooks.
Pure schedule-draft conversion and bed-row color helpers are separate from static
configuration. Named contracts live in feature types; public exports stay deliberate.

## Reception registration and clinic capacity

`features/doctors` owns editable total clinic capacity, app quota and reception
walk-in quota in its existing schedule editor. Shared contracts reject allocations
whose sum exceeds the total. Existing settings retain their app allocation;
reception starts at zero until explicitly configured.

`features/appointments` loads `get_portal_clinic_day` through its existing Server
Actions and `@startup/data-access`. The staff-only response includes the selected
clinic date, working hours, full physical timetable and separate used/remaining
counts, including booked, blocked and past times. The patient availability APIs
return only app-bookable choices.

Reception registration retains name/contact/reason and adds optional age/gender
and same-day check-in. Patient creation, reservation, queue ticket and optional
check-in share one transaction with idempotency protection. Registration requires
managed-practice access; it does not create an Auth account or establish patient
app access. Managers receive demographics through the existing authorized
appointment list. The table exposes booking source, arrival/queue state and
check-in, call-next, hold, resume and no-show actions; backend transitions remain
the authority for state, order and permissions. Queue boundaries remain per session.

The backend is defined by `20261015062322_portal_walk_in_appointments.sql` and
`20261021174352_clinic_channel_capacity_and_reception.sql`, both deployed to the
linked backend on 2026-10-21 with existing limits preserved. The rollback-only
`supabase/tests/smoke/clinic-channel-capacity.cli-smoke.sql` covers editable saves,
channel and total exhaustion, demographics, retries, queue creation and access
denial. Browser component previews use synthetic data; authenticated reception
and native mobile device verification remain separate.

## Mixed visit time blocks

The existing Doctor Schedule editor supports multiple time blocks for each visit
type, using that type's selected working days, duration, fee and daily quota.
`settingsDraft` restores the saved arrays and retains legacy single-hour fields.
Home blocks have an editable buffer before and after them. Shared contracts reject
invalid, undersized or overlapping blocks; the backend additionally checks the
doctor's other published modes and practices. To insert an online or home visit
inside previously continuous clinic hours, first publish the split clinic blocks.

The staff-only `get_portal_clinic_day` response includes `clinic_time_blocks` and
`doctor_timeline`. Reception's registration dialog shows the selected day's clinic,
online and home sessions, including other-practice time and travel reservations,
while its registration choices remain clinic-only. It exposes no other-practice
patient details. Queue boundaries and queue transition authority are unchanged.

`20261022071502_multi_block_service_schedules.sql` was deployed to the linked
backend on 2026-10-22. All four prior schedules retained their hours, prices and
quotas; the migration does not configure an illustrative mixed day. New publication
replaces only unbooked future availability from the selected date, preserving
existing reservations and rejecting conflicting edits with a useful error.
The rollback-only `supabase/tests/smoke/multi-block-schedule.cli-smoke.sql` tests
interleaving, patient choices, buffers, protected bookings, stale versions and
authorization. Web component screenshots use synthetic data and mocked actions;
authenticated live UI verification remains separate.

## Appointment attendance and recovery

`features/appointments` owns the Manage appointment dialog,
`hooks/useAppointmentRecovery.ts`, recovery display types and its Server Actions.
Actions require approved-facility access, validate shared input contracts, and call
the clinic operations in `@startup/data-access`; database practice permissions remain
authoritative. Loading replacement times and arranging a move additionally check
the authorized appointment's `can_manage` projection. Request decisions and
attendance actions require backend `can_manage_practice` permission.

The table and its filters use `appointmentRecoveryView` for expired requests,
needs-review, waiting-for-doctor, no-show, doctor-unavailable and rescheduled labels.
Its 30-second display clock cannot complete visits or decide attendance. Clinic
review follows the session end; other modes use the booked end plus configured
grace. Staff confirm patient no-show after the deadline or record doctor
unavailability separately with a reason. Resolving an attendance review does not
itself decide attendance. Approving a requested move revalidates its target; review
requests do not hold capacity.

Server Actions revalidate appointments and dashboard routes after mutations; the
dialog refreshes on success and on returned stale/mutation errors. Request creation
and decisions update the appointment version and explicitly call the existing
`emit_appointment_change` private emitter so the facility-scoped live-update bridge
refreshes pages. There is no direct browser access or
subscription to the private recovery request table. Replacement transactions retain
booking-source quotas and chain history; clinic arrivals get a new awaiting-arrival
ticket rather than inheriting check-in or QR state.

`features/doctors/components/AppointmentRecoveryPolicy.tsx` belongs to the existing
Doctor Schedule editor, with a separate versioned Server Action/RPC save. It requires
an approved doctor association and backend schedule-edit permission. Defaults are
15 minutes of attendance grace, zero minutes of patient notice and one patient move;
the respective ranges are 0–180, 0–10080 and 0–10. The policy applies to the practice
across visit types and does not publish slots. Reloading stale settings starts from
the latest saved version.

Recovery is locally implemented in
`20261023075921_appointment_recovery_and_rescheduling.sql`; rollback-only backend
workflow checks passed, while shared-database deployment awaits explicit approval. Desktop and narrow-width synthetic component
previews are captured in `.impeccable/review/recovery-desktop.png` and
`recovery-mobile.png` at the repository root. They do not establish authenticated
live workflow or native Patient/Doctor verification. Consultation billing is deferred
under the [payment integration plan](../../APPOINTMENT_RECOVERY_PAYMENTS.md).
