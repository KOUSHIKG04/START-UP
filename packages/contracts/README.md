# Shared domain and proposed API contracts

Client-safe TypeScript types for canonical appointment, queue, trip, credential
and membership states, independent/invited driver enrollment, and proposed
ID-based booking and aggregate-inventory inputs/projections.

The package now also contains Zod input and response schemas for phone sign-in,
onboarding, and the first clinic workflow. Earlier canonical state types remain
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
The first clinic RPCs are local pending SQL; they still need disposable-Postgres
integration tests, deployment and UI adapters. Keep Drizzle
models and database credentials out of this package. Supabase generated wire
types belong in data-access; UI labels map to canonical persisted states.

See ../../plans/ui-db-validation/api-contracts.md and ../../PROJECT_CONTEXT.md.
Clinical/prescription files remain empty pending structured prescribing review.
