# @startup/mobile-ui

Shared React Native presentation components for the patient, doctor and driver apps.
App screens, API calls, navigation decisions and business stores stay in `apps/`.

## Theme setup

Select the palette once at the app root, keeping the existing safe-area, font and
query providers. These are light app palettes; this package does not implement a
mobile dark-mode toggle.

```tsx
import { MobileThemeProvider, Button, Input, Chip } from "@startup/mobile-ui";

export function Example() {
  return (
    <MobileThemeProvider theme="doctor">
      <Input label="Doctor name" />
      <Button label="Continue" onPress={() => {}} />
      <Chip label="Selected" variant="radio" selected />
    </MobileThemeProvider>
  );
}
```

`useMobileTheme()` reads semantic colors from the nearest provider. Components with
a `theme` prop can override that palette; nested providers can scope a different
app palette. Without a provider, the default remains patient for compatibility.
Existing `appThemeColors`, `AppTheme` and `AppThemeColors` exports are supported.

Semantic roles live in `@startup/design-tokens`: background, surface, text,
textMuted, border, primary, onPrimary, danger and disabled states. `primaryText`
and `soft` support tinted component variants. Fixed illustration/SOS/decorative
colors live in `colors.ui` or the SOS palette rather than arbitrary hex values
inside components. Caller styles remain the final override.

## Components and ownership

- `primitives/`: Button, Input, TextArea, SearchInput, Chip, Card, Dropdown,
  Accordion, TimeSlot, UploadInput, StatusBadge, IconLabel and FadedScrollView.
- `components/`: Header, BottomNavBar and SOSButton compositions.
- `layout/`: Screen.
- `theme/`: MobileThemeProvider and useMobileTheme.
- `utils/`: geometry, fonts and compatibility helpers.

Import supported APIs from `@startup/mobile-ui`. Use props/callbacks to connect
components to app features. Add a shared component when it has a reusable UI
contract; keep one-screen compositions in the feature that owns them.

`Input` derives its accessible name from `label` unless `accessibilityLabel` is
provided. BottomNavBar exposes tab roles and selected state. Custom icon-only
controls still need meaningful labels. Chip radio variants expose checked state.

## Fonts

Pass `albertSansFonts` to Expo's `useFonts` at the app root. The font loader uses
public `@startup/design-tokens/fonts/*` exports, not sibling-directory paths.

## Verification

From the monorepo root:

```sh
pnpm --filter @startup/mobile-ui typecheck
pnpm --filter @startup/mobile-ui test
pnpm --filter @startup/design-tokens check
```

The Node contract tests execute component functions with lightweight native hosts.
They check theme inheritance/overrides, accessibility props and disabled behavior.
They do not replace native layout, gesture, font-loading or screen-reader checks
on a physical device. Keep the three app TypeScript checks in the verification
sequence when changing public component props.
