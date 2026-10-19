# Repository working rules

Read [ARCHITECTURE.md](ARCHITECTURE.md) and the target app's architecture document
before changing structure. Follow any nested `AGENTS.md` in the target directory.
The user's requested scope takes precedence over this guidance.

## Find the owner before adding code

- Search for the existing implementation, callers, types, constants, tests, and
  any empty scaffold for the same responsibility before creating a file.
- Extend the existing owner. If an empty scaffold is obsolete, do not create a
  second implementation beside it or fill it merely to make it nonempty.
- When replacing an implementation, update callers and inspect references to the
  old location. Remove obsolete files only within the authorized scope.
- Create directories with their first real implementation. Do not add speculative
  `api`, `hooks`, `components`, `types`, or `utils` directories or `.gitkeep` files.
- Record unimplemented work in documentation rather than empty source files.
  Existing placeholders are historical leftovers, not required architecture.

## Keep responsibilities local

- `src/app` owns routing and composition; `src/features/<domain>` owns feature work.
- Feature components, hooks, types, and static configuration stay with their owner.
  Follow the feature's existing naming; do not introduce a parallel convention.
- Put static options and display mappings in the owning feature's
  `utils/*Constants.ts`. Keep state-dependent values in the component or hook.
- Small private components and one-off literals can stay local. Extract when a
  unit has a distinct responsibility, useful reuse, or separate state/lifecycle;
  file length alone is not a reason to split it.
- Put UI shared across unrelated app features in `src/components`; put generic
  mobile primitives in `packages/mobile-ui`. Shared UI must not import app features.
- Shared client-safe domain validation belongs in `packages/contracts`; reusable
  backend operations belong in `packages/data-access`. App query hooks compose
  those operations. Do not copy business rules between Patient, Doctor, and Driver.
- Use the public APIs of shared packages. Avoid circular imports and feature
  internals as accidental cross-feature dependencies.

## Preserve working flows during cleanup

- Separate structural refactors from behavior, UI, dependency, and schema changes.
  Use small, reviewable steps within one feature or flow.
- Preserve routes, parameters, props, query keys, cache invalidation, subscriptions,
  effect cleanup, permissions, mutation arguments, and public package exports.
- Moving a hook must preserve where and how often it mounts. Do not introduce a
  second subscription or reset form state through changed component identity.
- Inspect references before deleting or moving files. Preserve unrelated work.
- Use the existing focused tests and compare typecheck failures with the baseline.
  Verify device flows when lifecycle, location, camera, or notifications matter;
  typechecks alone do not verify those behaviors.

## Finish the change

- Update architecture documentation when ownership, routes, or integration status
  changes. Distinguish local implementation from deployment and device verification.
- Format every added or changed supported file with the root Prettier configuration.
  Avoid repo-wide formatting during a scoped feature change unless requested.
- Run checks appropriate to the change and applicable nested instructions. Report
  existing failures and unverified behavior accurately.
- For documentation-only changes, format/check the touched Markdown and review the
  diff. Do not modify application code or run migrations as a side effect.
