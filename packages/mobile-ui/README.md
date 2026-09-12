# @startup/mobile-ui

Shared Expo and React Native components for the patient, doctor, and driver
apps. Mobile styling uses NativeWind `4.2.6`, the current stable release.

## NativeWind design system

Each mobile app loads the shared preset after the NativeWind preset:

```js
presets: [
  require("nativewind/preset"),
  require("@startup/mobile-ui/nativewind-preset"),
];
```

The preset reads colors, spacing, radius, and typography from
`@startup/design-tokens` and exposes semantic mobile classes:

```tsx
import { AppText, Screen } from "@startup/mobile-ui";

export function PatientHomeScreen() {
  return (
    <Screen className="bg-patient-background px-lg pt-xl">
      <AppText variant="heading" className="text-patient-text">
        Appointments
      </AppText>
    </Screen>
  );
}
```

Available groups include `patient-*`, `doctor-*`, `driver-*`, `sos-*`, and
`navigation-*`, along with shared surface/content colors, named spacing and
radius tokens, and typography such as `text-app-heading` and
`text-app-caption`.

Use regular React Native styles for runtime-calculated measurements,
animations, SVG attributes, and third-party components that do not support
NativeWind interoperability.
