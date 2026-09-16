# Patient mobile architecture

`src/app` owns Expo Router routes, URL parameters, navigation callbacks, and layouts. Screen implementations live in `src/features/<domain>/screens`. Feature components, data, hooks, and utilities live with their domain. Use `@/` for app source imports.

`(auth)` contains login and onboarding placeholders. `(app)` contains the patient stack; it is currently accessible without authentication. Add session restoration and `Stack.Protected` when auth is integrated. A route group's name does not provide access protection.

`(tabs)` contains only Home, Appointments, Records, and Profile. Detail screens are sibling stack routes and do not show the bottom navbar. SOS uses modal presentation.

## Routes

- `/`, `/appointments`, `/records`, `/profile`
- `/doctor/search`, `/doctor/results`, `/doctor/[id]`
- `/booking/[id]`, `/visit/[id]`
- `/ambulance`, `/medicines`, `/prescription`, `/sos`
- `/login`, `/onboarding`

Doctor profiles resolve stable mock doctor IDs from feature data. Booking and visit routes retain the existing serialized appointment parameters until a real appointment data source is integrated.

## Ownership

- Generic mobile UI: `packages/mobile-ui`.
- Colors, fonts, spacing, and shadows: `packages/design-tokens`.
- Domain UI and behavior: `src/features`.
- Patient components reused by multiple features: `src/components`.
- App providers: `src/providers`.
- Shared appointment and screen props: `src/types`.
- Mock records and static options: feature `data` folders.

Transient inputs, tabs, drawers, and current UI simulations remain local component state. Add real Zustand stores in `src/stores` when a workflow must share state across routes. Add integration clients under `src/services` when backend integration starts. Do not add empty stores, clients, or fake authentication just to populate folders.

The existing fade transition is retained. Expo native-stack's custom 350ms duration is honored on iOS; Android uses its native fade timing.

After changing route files, restart Expo so typed-route declarations are regenerated.
