# Patient app structure

`src/app` contains Expo Router layouts and route adapters. Adapters read route
parameters and connect screen callbacks to navigation. UI lives in `src/features`.

| Folder | Responsibility |
| --- | --- |
| `features/auth` | Login and onboarding placeholders |
| `features/home` | Home screen, search overlay and home sections |
| `features/doctors` | Search, results, doctor profile and related UI |
| `features/appointments` | Appointment list, booking status, appointment types and parameters |
| `features/consultations` | Clinic, home and online visits, completion and feedback |
| `features/ambulance` | Ambulance booking, tracking, payment, completion and SOS |
| `features/records` | Medical records |
| `features/prescriptions` | Prescription display |
| `features/medicines` | Medicine display |
| `features/profile` | Profile, settings and related dialogs |
| `components` | UI shared across unrelated features |
| `types`, `hooks`, `utils` | Cross-feature types and helpers only |
| `services` | Empty platform integration placeholders |
| `providers`, `stores` | Reserved for future providers and client state |

Within each feature, `screens`, `components`, `types` and `utils` own existing
implementation. `api` and `hooks` placeholders are reserved for backend integration.
Generic UI remains in `packages/mobile-ui`.

## Navigation compatibility

`(auth)` and `(app)` are URL-free route groups. The existing URLs, route parameters,
screen callbacks and four-tab navigation are preserved, including `/find-doctor`,
`/doctor-results`, `/doctor-profile`, `/booking-status`, `/visit-session`, `/ambulance`,
`/prescription`, `/medicines` and `/sos`. Fade transitions remain 350 ms.

The root layout owns fonts, splash screen, theme and safe areas. The app group owns
the main stack and the tab group owns the bottom navigation. Authentication is not
enforced yet. Login and onboarding still render their original empty screens.

Routes have not been converted to ID-based URLs: current demo flows pass display
data in query parameters. Introduce ID-based routes when real records are connected,
with compatibility redirects if existing links must continue working.

## Future data integration

Create an app-specific Supabase client in `services/supabase.ts` with mobile session
storage. Shared reusable operations will live in `packages/data-access`; app-specific
queries and hooks live inside each feature. Shared validation contracts belong in
`packages/contracts`. These packages and services are currently scaffolding only.

Use one source for authentication session state; use query caching for server data
and local state or Zustand for UI and drafts. Do not duplicate fetched records in a
second global store. Add the app-group session guard when authentication is ready.

Dependencies should flow from routes to features to shared code. Shared UI and
packages must not import patient screens. Cross-feature imports should be limited to
deliberately reusable components/types/helpers, with no circular dependencies.
