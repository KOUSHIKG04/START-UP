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
- `components/`: Header, SectionHeader, NotificationDrawer, BottomNavBar and
  SOSButton compositions.
- `layout/`: Screen.
- `theme/`: MobileThemeProvider and useMobileTheme.
- `types/`: public component props and shared UI contracts. Component modules
  retain their existing type exports for compatibility.
- `hooks/`: reusable UI lifecycle/state coordination.
- `utils/`: calendar, clock, dropdown, preview and keyboard geometry helpers,
  component configuration, fonts and compatibility helpers.

Import supported APIs from `@startup/mobile-ui`. Use props/callbacks to connect
components to app features. Add a shared component when it has a reusable UI
contract; keep one-screen compositions in the feature that owns them.

`Card` in its default/elevated and outlined variants, and outlined/elevated
`Accordion` surfaces, use `surfaces.card`: a `0.4` light gray border and the shared
soft shadow. Custom content cards use the same preset from `@startup/design-tokens`.
Explicit style/prop overrides still support selected and other semantic states;
plain/soft variants remain available for layout and tinted containers.

`SectionHeader` accepts a title, optional action text/callback, visibility and style
overrides. It inherits the app palette or accepts an explicit `theme`.

`NotificationDrawer` accepts presentation-ready `NotificationItem` data, loading
and deletion state, and callbacks for reading, pressing and deleting notifications.
It owns filtering, swipe actions, safe areas and the drawer animation. Its optional
`onVisibilityChange` includes the closing animation so app queries can stay enabled
until the drawer is hidden. Notification fetching, cache updates, copy mapping and
navigation stay in each app's notification feature hook; feature adapters compose
the drawer. The shared UI has no backend or router imports. Notification and
section-header types live in `src/types` and retain their public package exports.

```tsx
<NotificationDrawer
  visible={visible}
  onClose={close}
  notifications={items}
  loading={loading}
  onMarkAllRead={markAllRead}
  onNotificationPress={openNotification}
  onDelete={deleteNotification}
/>
```

`Input` derives its accessible name from `label` unless `accessibilityLabel` is
provided. BottomNavBar exposes tab roles and selected state. Custom icon-only
controls still need meaningful labels. Chip radio variants expose checked state.

## Fonts

Pass `interFonts` to Expo's `useFonts` at the app root. The font loader uses
public `@startup/design-tokens/fonts/*` exports, not sibling-directory paths.
`albertSansFonts` remains a compatibility alias for existing callers.

## Verification

During in-call chat, tapping the floating video in `ConsultationCall` restores the
full-screen video. Its accessible button remains separate from camera flip, while
`FloatingVideo` continues to own the drag threshold and bounds. Component tests
cover the return action in Patient and Doctor themes; native gestures require a
connected device for verification.

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

See the [shared package ownership guide](../ARCHITECTURE.md) before extending this
package. `FloatingVideo` owns preview gestures without moving call/chat state or
backend operations into shared UI. Keep private render helpers local when they do
not have a separate responsibility. Upcoming payment UI follows the same
presentation-only boundary; payment SDKs, queries and provider secrets have other
owners described in that guide.
