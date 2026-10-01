<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Web feature architecture

- Read `ARCHITECTURE.md` before adding routes or screens.
- Admin pages belong only under `src/app/(admin)`; login belongs under `(auth)`.
  Do not recreate ungrouped routes with the same URL or wrap pages in AdminLayout.
- Route files compose public feature exports from `src/features/<domain>/index.ts`.
- Features own screens, components, hooks, types and `utils/*Constants.ts`.
  Put demo data, options and configuration in the owning feature's utils.
- Compose different features in routes using props/slots; do not import another
  feature's implementation into a feature. Shared components must not import features.
- Put interactive workflows behind explicit client boundaries. Keep server-only
  code out of feature barrels consumed by Client Components.
- Run web architecture checks, architecture tests, lint and typecheck after changes.
