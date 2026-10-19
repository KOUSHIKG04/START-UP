# Repository structure and ownership

This document describes ownership in the existing codebase. It does not prescribe
creating every possible subfolder. Each mobile app has an `ARCHITECTURE.md` with
its current integration boundaries; the web apps have their own local guidance.

## Shared ownership

The package-level [ownership and extension guide](packages/ARCHITECTURE.md) records
the current shared folders, compatibility boundaries, and future payment ownership.

| Location                                | Responsibility                                                                                |
| --------------------------------------- | --------------------------------------------------------------------------------------------- |
| `apps/patient-mobile`                   | Patient discovery, booking, appointments, visits, ambulance requests, and personal records UI |
| `apps/doctor-mobile`                    | Doctor onboarding, practices, schedules, appointment review, and consultation UI              |
| `apps/driver-mobile`                    | Driver onboarding, availability, offers, trips, saved locations, and tracking UI              |
| `apps/facility-portal`                  | Facility management and appointment/schedule web workflows                                    |
| `apps/company-admin`                    | Platform review and administration web workflows                                              |
| `packages/mobile-ui`, `packages/web-ui` | Reusable presentation components for their platforms                                          |
| `packages/design-tokens`                | Shared visual tokens and typography                                                           |
| `packages/contracts`                    | Client-safe domain types and runtime input/response schemas                                   |
| `packages/data-access`                  | Client factories, generated wire types, and reusable backend operations                       |
| `packages/database/src/schema`          | Database schema definitions                                                                   |
| `supabase/migrations`                   | Versioned database changes, including RPCs, triggers, and policies                            |
| `supabase/functions`                    | Implemented server integrations; future handlers are documented                               |

An adapter, source file, or migration in the repository does not prove that it is
deployed or that its device workflow has been verified.

## App ownership

Routes in `src/app` read parameters and compose feature screens. Feature code lives
under `src/features/<domain>`. Within an existing feature:

- `screens` compose a navigable screen.
- `components` contain feature UI units with meaningful boundaries.
- `hooks` contain React state, query, mutation, and lifecycle coordination.
- `types` contain feature UI contracts; shared domain contracts stay in the package.
- `utils` contain pure helpers and feature-owned `*Constants.ts` configuration.

These are available responsibilities, not a folder checklist. A feature can start
with one screen and grow only when real code needs a distinct owner.

App-wide providers, clients, stores, and shared UI stay at app level. Server data
uses the existing query cache; UI drafts may use local state or existing stores.
Do not introduce a second cache or session source during structural cleanup.

## Current shared domain modules

Clinic booking and appointment transitions use the `clinic` contracts/operations.
Clinical intake, prescriptions, follow-up, and records use the `clinical` modules.
Ambulance operations, driver fleet/profile, trips, tracking, and SOS already have
modules in `packages/data-access/src/ambulance` and corresponding contracts.
Search these owners before implementing a similarly named service or adapter.

Device integration remains app-specific: notification registration is under
`features/notifications`, while location selection and tracking live in their
owning features. An empty `services/location.ts` or `services/notifications.ts`
does not supersede these implementations.

## Historical placeholders and cleanup

Mobile `.gitkeep` markers, empty mobile location/notification service files, and
unreferenced shared appointment/record/ambulance/clinical-contract stubs have been
removed after a reference check. Reviewed web and Supabase placeholders have also been removed; future work is
documented rather than represented by empty source files.

Before any cleanup, inspect imports, route adapters, package exports, config, and
the current working tree. Retain the working owner and remove superseded scaffolds
only in an explicitly scoped cleanup. Record genuinely future work as documentation.
Do not manufacture implementations to populate empty files.

The unused Supabase schema/function/RLS-test placeholders have been removed.
Local `schema_paths = []` remains unchanged. SQL smoke fixtures live under
`supabase/tests/smoke`; Drizzle models and model/integration tests remain in
`packages/database`. Upcoming payment, reservation and dispatch integrations are
documented in `supabase/functions/README.md`; their config entries stay disabled.
Never alter applied migration history as folder cleanup.

Update these documents in the same change when code ownership or integration
status changes. The operational rules are in [AGENTS.md](AGENTS.md).

## Mobile composition boundaries

`packages/mobile-ui` owns the themed `SectionHeader` and presentation-only
`NotificationDrawer`/notification cards. Each mobile app keeps a small
`features/notifications/components/NotificationDrawer.tsx` adapter; its feature
hook owns the client, query/cache actions, notification text and navigation.
Shared UI receives data and callbacks rather than importing app features or
backend clients. Notification UI types live in `mobile-ui/src/types`; the shared
time formatter is a `contracts/src/utils` export. App regression tests live in
their app's `tests` directory rather than alongside runtime components.

Patient booking coordination lives in `features/doctors/hooks`; its screen composes
the booking sections and confirmation dialog. Doctor appointment review and schedule
coordination live in their feature hooks. The consultation form retains its keyed
wizard boundary and composes separate vitals, prescription, and follow-up sections.
Driver registration has individual screens behind its existing compatibility export;
Home and Trip hooks own their existing data/actions, with feature-owned display maps.

Patient's full feature ownership review is recorded in
[`apps/patient-mobile/FEATURE_STRUCTURE.md`](apps/patient-mobile/FEATURE_STRUCTURE.md).
Its screens compose feature hooks rather than importing query/backend APIs. Named
contracts, pure helpers, static configuration, platform integrations and draft
stores have explicit owners within each feature. Structure and lifecycle checks
guard those boundaries while retaining existing routing and workflow behavior.

The same feature ownership review is recorded for
[`apps/doctor-mobile/FEATURE_STRUCTURE.md`](apps/doctor-mobile/FEATURE_STRUCTURE.md)
and [`apps/driver-mobile/FEATURE_STRUCTURE.md`](apps/driver-mobile/FEATURE_STRUCTURE.md).
Their controllers, UI sections, contracts, configuration, platform services and
navigation drafts stay with their owning features. Background task registration
and consultation wizard mount boundaries remain explicit integration points.

Location selection and background tracking have different lifecycle requirements.
The Driver location pickers share pure helpers/styles, while retaining separate
draft stores and confirmation navigation. Structural checks do not replace device
verification of permissions, camera/map behavior, notifications, or tracking.

## Web composition boundaries

Facility Portal and Company Admin record their ownership reviews in
[`apps/facility-portal/FEATURE_STRUCTURE.md`](apps/facility-portal/FEATURE_STRUCTURE.md)
and [`apps/company-admin/FEATURE_STRUCTURE.md`](apps/company-admin/FEATURE_STRUCTURE.md).
Web routes compose public feature entries. Workflow hooks preserve state and effect
ownership; named contracts, static configuration, pure helpers and platform services
stay with their feature. Server query loaders and Server Actions retain their
authorization boundaries and remain outside client module graphs.

Web regression tests live in each app's `tests/unit` directory. Facility Portal's
`scripts` contains the architecture inspector and small shared test tools, also
used by Company Admin; this is tooling reuse, with no runtime app dependency.
Empty web dispatch/staff and server scaffolds have been removed. Their future work
is documented rather than represented by empty source files.

## Backend composition boundaries

The [Supabase guide](supabase/README.md) owns backend layout and environment
verification. SQL smoke fixtures are separate from pgTAP tests; the existing
disposable runner resolves their files from `supabase/tests/smoke` and retains its
target guards. `supabase/seed.sql` is the main manual SQL fixture; alternative
fixture SQL stays in `supabase/fixtures`. Automatic seeding remains disabled.

`packages/database` remains optional Drizzle tooling for the same Supabase
PostgreSQL database. It is not a separately deployed service or a client import.
The Supabase CLI remains the only deployment migration runner.
