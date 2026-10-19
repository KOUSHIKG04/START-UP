# Company Admin architecture

Follow the repository [ownership map](../../ARCHITECTURE.md) and
[working rules](../../AGENTS.md). This app uses Next.js App Router for the company
reviewer console.

Routes and layouts own URL parameters, metadata and the authenticated shell.
Verification owns the overview, queue, case detail, document decisions and final
verification workflows. Authentication owns the login UI and sign-in/out actions.
Feature UI, hooks, named types, display constants and server operations stay with
their feature. Create directories only with implemented code.

The request-scoped Supabase client and cookie handling stay in `src/lib`.
`requireReviewer` remains a server-only authorization boundary used by protected
pages and every review action. Moving a module must preserve that check, input
validation, redirects, document response headers and cache revalidation paths.

Routes compose public feature exports. Keep server-only entry points separate
from client-consumed modules; Server Actions retain their `"use server"` boundary.
Shared UI uses `@startup/web-ui`; shared domain types and backend operations use
the existing contracts and data-access packages. Client components must not
import the request-scoped client or reviewer guard.

Structural cleanup preserves URL paths, search parameter filtering, keyed table
resets, form action bindings, pending states and toast/refresh effects. Source and
mocked tests do not establish deployed authorization or browser behavior.

## Implemented feature ownership

See [FEATURE_STRUCTURE.md](FEATURE_STRUCTURE.md) for the file-by-file review.
Verification screens are composed by thin route exports. Server-only loaders own
overview, queue and case reads, while `verification/server/actions.ts` owns document
decisions and finalization. UI sections, form hooks, types and display constants
stay in the verification feature. Auth owns login UI and server sign-in/out actions.
The request-scoped client and `requireReviewer` guard remain in `src/lib`.

The `server.ts` auth entry is a separate guarded entry for server composition;
client forms import only the action module. Client code never imports query loaders
or the reviewer guard. Keep `index.ts` exports deliberate and route-owned.

## Verification commands

```sh
pnpm --filter company-admin check:architecture
pnpm --filter company-admin test:architecture
pnpm --filter company-admin test
pnpm --filter company-admin lint
pnpm --filter company-admin typecheck
pnpm --filter company-admin build
```

The architecture inspector and small test tools are reused from Facility Portal
scripts. This is repository tooling reuse, with no application runtime dependency.
Existing baseline diagnostics and browser/deployment limits are recorded in the
feature review. Do not infer successful deployment from local source checks.
