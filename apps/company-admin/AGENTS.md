<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Web feature architecture

- Read `ARCHITECTURE.md` and the repository ownership map before restructuring.
- Routes compose public feature exports; features must not import route modules.
- Keep UI, hooks, named contracts, static configuration and server operations with
  their feature. Use the existing kebab-case UI/type filenames and `*Constants.ts`
  display modules. Create folders with their first implementation.
- Keep server query entry points guarded and action modules behind `"use server"`.
  Do not expose server-only query code through a client-consumed barrel.
- Preserve reviewer checks, action bindings, validation, revalidation paths,
  keyed table resets, URL parameters and effect cleanup during structural changes.
- Run architecture checks, unit tests, lint and typecheck. Report existing failures
  separately from refactor regressions; browser/deployment checks remain separate.
