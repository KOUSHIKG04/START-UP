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

## When initializing shadcn

Shadcn is not installed by this theme integration. Keep this adapter when running
initialization; remove generated preset color definitions that would override it.
Preserve generated non-color setup (such as required animation imports) as needed.
Do not point the CLI CSS output at `packages/design-tokens/theme.css`: that package
owns the platform palette and must not be rewritten by a component preset.

Add components under `src/components/ui` after configuring both workspaces.
Inspect new component styles against this theme before use. Chart colors and
dark-mode colors should be defined in the design system when those features ship.
