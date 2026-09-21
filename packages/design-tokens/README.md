# @startup/design-tokens

Shared TypeScript tokens, generated Tailwind CSS v4 theme variables, and Albert Sans font assets.

## Public exports

The root exports `colors`, palette shortcuts (`patientColors`, `doctorColors`, `driverColors`, `adminColors`, `sosColors`), `gradients` and gradient shortcuts, `spacing`, `radius`, `shadows`, `typography`, and `fontFamilies`. `tokens` (also the default export) groups the original six token categories.

`mobileThemes`, `MobileThemeName`, and `MobileThemeColors` provide patient, doctor, and driver semantic colors, including foreground, background, surface, border, placeholder, danger, and disabled roles. `webColors` contains the web chart and dark-mode palette. `colors.ui` holds shared component details.

```tsx
import { colors, typography, mobileThemes } from "@startup/design-tokens";
const screenStyle = { backgroundColor: mobileThemes.patient.background };
const headingStyle = { ...typography.heading, color: colors.patient.text };
```

Patient background is white (`#FFFFFF`) on both platforms; admin background is `#F9FAFB`. SOS colors live under `colors.patient.sos`.

## Web theme

```css
@import "tailwindcss";
@import "@startup/design-tokens/theme.css";
```

Use utilities such as `bg-patient-bg`, `text-admin-text`, and `bg-gradient-admin`. Existing CSS variable names are preserved, including `--color-driver-ready` and `--color-admin-bg`. Other palette fields use kebab case. The CSS uses `@theme static` so variables remain available to consuming theme mappings.

## Fonts

Four bundled TrueType assets use extensionless public subpaths. Register them in an Expo application with `useFonts`:

```tsx
import { useFonts } from "expo-font";
const [fontsLoaded] = useFonts({
  AlbertSans_400Regular: require("@startup/design-tokens/fonts/AlbertSans_400Regular"),
  AlbertSans_500Medium: require("@startup/design-tokens/fonts/AlbertSans_500Medium"),
  AlbertSans_600SemiBold: require("@startup/design-tokens/fonts/AlbertSans_600SemiBold"),
  AlbertSans_700Bold: require("@startup/design-tokens/fonts/AlbertSans_700Bold"),
});
```

Wait for font loading in the app's existing loading flow. Registration names match `fontFamilies` and `typography`.

## Changing tokens

Edit `src/colors.ts`, `src/gradients.ts`, or `src/web-colors.ts`, then run `pnpm --filter @startup/design-tokens generate` and commit the generated `theme.css`. Do not edit CSS directly. `src/themes.ts` maps colors to mobile semantic roles.

The generator needs Node 22.6 or later and uses built-in TypeScript stripping. From the repository root:

```sh
pnpm --filter @startup/design-tokens check
pnpm --filter @startup/design-tokens test
pnpm --filter @startup/design-tokens typecheck
```

`check` detects stale CSS without rewriting it. Tests verify CSS consistency, native/CSS gradient agreement, and actual package resolution of all font assets. `lint` runs the generation check for the monorepo task runner. UI components are provided by the platform UI packages.
