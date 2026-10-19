# Shared web UI

Generic web components live here; admin workflows and data access belong in web
features. The palette is owned by `@startup/design-tokens/theme.css`.

## Admin theme

Import `@startup/web-ui/styles/theme.css` after Tailwind in the app stylesheet.
This adapter maps shadcn semantic color variables to the existing admin design
tokens. Use `bg-primary`, `text-primary-foreground`, `bg-card`, `text-foreground`,
`text-muted-foreground`, and `border-border` in new components instead of hex values.

The theme is currently light-only, matching the existing design system. Dark
mode needs separately defined design tokens before a theme switch is introduced.
Fonts remain configured by the consuming Next.js app. Existing radius and spacing
utilities are unchanged.

## Component ownership

Shadcn primitives live in `src/components/ui`. Keep related compound components
together. Preserve this theme adapter when adding components; remove generated
preset color definitions that would override it. Preserve required non-color
setup, such as animation imports, as needed.
Do not point the CLI CSS output at `packages/design-tokens/theme.css`: that package
owns the platform palette and must not be rewritten by a component preset.

Add components under `src/components/ui` after configuring both workspaces.
Inspect new component styles against this theme before use. Chart colors and
dark-mode colors should be defined in the design system when those features ship.

Custom compositions live in `src/components`. `DataTable` mounts
`hooks/use-data-table.ts` once for its controlled/uncontrolled sorting and
pagination. Custom table/list contracts live in `src/types`, with their existing
component exports retained. Generic helpers stay in `src/lib` and the mobile
viewport hook stays in `src/hooks`.

Run `pnpm --filter @startup/web-ui test` and
`pnpm --filter @startup/web-ui typecheck` from the repository root. Hook tests
exercise state ownership and callback arguments; they do not replace browser
layout or accessibility checks. See the
[shared package ownership guide](../ARCHITECTURE.md) for future payment boundaries;
backend operations and payment workflow decisions stay outside this UI package.
