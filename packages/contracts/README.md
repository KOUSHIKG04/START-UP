# Shared domain and proposed API contracts

Client-safe TypeScript types for canonical appointment, queue, trip, credential
and membership states, independent/invited driver enrollment, and proposed
ID-based booking and aggregate-inventory inputs/projections.

The package now also contains Zod input and response schemas for phone sign-in,
onboarding, clinic/clinical workflows, driver/trip/tracking, and other implemented
adapters. Earlier canonical state types remain
compile-time contracts. A schema or adapter is not a deployed endpoint.

Use a TypeScript-only type for a stable internal shape or a workflow that is still
proposed. Types disappear at runtime and cannot reject malformed network data.
Use Zod for data crossing an app boundary: form/OTP input, RPC arguments, and
JSON returned from Supabase. Derive the TypeScript type with `z.infer` from that
schema instead of maintaining a second handwritten copy. The existing
`appointments.ts`, `profiles.ts`, `ambulance.ts` and `facilities.ts` types document
canonical states or proposed projections; `validation.ts` and `clinic.ts` validate
the implemented local Auth/clinic adapters. Do not treat a TypeScript interface
alone as server validation. PostgreSQL RPCs still perform their own authorization
and business-rule checks even when a client uses Zod.
Check migrations and the target environment separately before claiming an RPC is
deployed or tested. Keep Drizzle
models and database credentials out of this package. Supabase generated wire
types belong in data-access; UI labels map to canonical persisted states.

See ../../plans/ui-db-validation/api-contracts.md and ../../PROJECT_CONTEXT.md.
`clinical.ts` contains implemented clinical intake, prescription, follow-up, and
record schemas. The unreferenced empty `consultations.ts` and `prescriptions.ts`
scaffolds have been removed. Extend the existing clinical contracts instead of
introducing duplicate shapes.

Date helpers are exported from the public package API. The shared
`utils/notificationTime.ts` formatter retains the mobile apps' relative-time labels
and falls back to `formatDisplayDate` for older, future or invalid timestamps.
Its boundary checks live in `tests/notification-time.test.ts` and run with the
package's existing Bun test command.

Pure date implementations now live in `utils/dates.ts`; the root `dates.ts`
retains compatibility for existing direct imports. Language display/code mappings
live in `utils/languageConstants.ts`, while their public functions retain the
existing exports. Domain schema modules and their inferred types remain together.

See the [shared package ownership guide](../ARCHITECTURE.md) for payment and other
upcoming domains. Add payment schemas and types with the first working integration;
do not duplicate booking/trip contracts or add empty payment modules in advance.
