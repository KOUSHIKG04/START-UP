# CLINZO Driver

Expo / React Native ambulance-partner app. Phone OTP, independent/invited driver onboarding and pending/verified access gates use the shared Supabase backend. The old sample dispatch, trip, chat and earnings implementations remain design previews in source; the active driver routes show backend verification status instead of presenting them as real trips. Set this app's `.env.local` from `.env.example`; see [mobile-backend-integration.md](../../plans/mobile-backend-integration.md) for setup and blockers.

## Run

Use Node.js 22 or later and the repository's pinned pnpm 12.4.1. Run these commands from the repository root:

```sh
pnpm install
pnpm --filter driver-mobile start
```

Choose the command for the desired target:

```sh
pnpm --filter driver-mobile web
pnpm --filter driver-mobile android
pnpm --filter driver-mobile ios
pnpm --filter driver-mobile tunnel
```

Android requires a running emulator or connected device. The iOS simulator requires macOS; on Windows use an appropriate physical-device Expo client. The root shortcut `pnpm dev:driver` also starts this app.

Validation commands, also from the repository root:

```sh
pnpm --filter driver-mobile typecheck
pnpm --filter driver-mobile test
```

## Architecture

The structure follows `apps/patient-mobile`: Expo Router files select and connect screens; screen implementations live outside the route tree.

| Location | Responsibility |
| --- | --- |
| `src/app/_layout.tsx` | Root stack, shared Albert Sans font loading, splash lifecycle and safe-area provider. The package entry is `expo-router/entry`. |
| `src/app/*.tsx` | Thin route adapters for welcome, details, documents, verification and chat; connect navigation and store actions to screens. |
| `src/app/(tabs)/` | Home, Trips, Earnings and Profile navigation with shared `BottomNavBar`. The active-trip route is hidden from the bar. Verification gates the tab area. |
| `src/screens/registration/RegistrationScreens.tsx` | Welcome, personal details, vehicle/documents and pending/verified presentations. |
| `src/screens/home/HomeScreen.tsx` | Availability, overview, map preview and expiring request modal. |
| `src/screens/trip/TripScreen.tsx` | Pickup, arrival/PIN, in-progress and completed-trip states. |
| `src/screens/chat/ChatScreen.tsx` | Local conversation composer and sample messages. |
| `src/screens/earnings/EarningsScreen.tsx` | Session earnings and date-filtered history; the Trips route uses the history presentation. |
| `src/screens/profile/ProfileScreen.tsx` | Profile summary, availability, edit links and support information. |
| `src/store/driver.ts` | Zustand in-memory profile, verification, availability, dispatch deadline, guarded trip transitions, completed trips and messages. |
| `src/store/documents.ts` | In-memory selected-document metadata and vehicle details. |
| `src/components/DriverUI.tsx` | Driver-specific composition helpers for headers, text, cards, metrics and screen spacing. |

`@startup/design-tokens` remains the shared source for the driver palette and Albert Sans families. `@startup/mobile-ui` supplies shared buttons, inputs, bottom navigation, fonts and safe-area exports. Driver-specific compositions belong in this app; reusable primitives and token changes belong in the shared packages. Existing product/design context remains authoritative; this extension does not establish a new design system.

## Preview walkthrough

1. From Welcome, choose **Set up driver profile**. Enter personal details and consent to verification checks. A profile photo is optional.
2. Select the ambulance classification, enter a registration number and choose all required document files. Documents accept PDF/JPG/PNG up to 10 MB; image-only fields accept JPG/PNG. The profile photo limit is 5 MB.
3. Submit to view pending verification. Choose **Preview verified state**, then open the dashboard. Submission never performs real approval; the verified state is an explicit preview action.
4. Switch online and choose **Preview emergency request**. Accept within **15 seconds**, reject it, or let it expire. This button creates a sample request locally.
5. Accept, mark arrival at pickup, enter preview PIN **1234**, start the trip and complete it. Incorrect PINs show an error. Completed trips populate Trips and Earnings in the current session.
6. Open patient chat from the trip, send local messages, and return to the trip. Use Profile to revisit personal details, documents and verification.

All application records live in memory and reset when the app reloads. The document picker selects local files and may copy them to the app cache; no file is uploaded or reviewed. Chat messages stay on the device and are never delivered to a patient. Patient calling is not connected. Preview fares, locations, patient details, distances, speed and ETA are sample values. Maps are static Figma imagery with no location tracking or live navigation.

## Figma traceability and assets

Source file: [CLINZO Figma design](https://www.figma.com/design/JPyiy9pnS8Ywy9SlSyGUqu). The 14 supplied nodes map to these implemented routes and states:

| Supplied node | Screen/state | Implementation |
| --- | --- | --- |
| `529:11` | Welcome | `/` → `WelcomeScreen` |
| `677:86` | Personal details | `/details` → `DetailsScreen` |
| `529:13` | Vehicle and documents | `/documents` → `DocumentsScreen` |
| `677:302` | Pending verification | `/verification` → `VerificationScreen`, pending |
| `677:341` | Verified | `/verification` → `VerificationScreen`, verified preview |
| `617:16` | Offline home | `/home` → `HomeScreen`, offline |
| `617:78` | Online home | `/home` → `HomeScreen`, online |
| `617:143` | Incoming request | `/home` → request modal |
| `617:185` | Navigate to patient | `/trip` → pickup stage |
| `617:251` | At pickup / patient PIN | `/trip` → arrived stage |
| `617:321` | Trip in progress | `/trip` → progress stage |
| `617:383` | Trip complete | `/trip` → complete stage |
| `701:30` | Patient chat | `/chat` → `ChatScreen` |
| `617:453` | Earnings | `/earnings` → `EarningsScreen` |

**Custom companion screens:** `/trips` and `/profile` extend the supplied navigation using the incumbent driver visual language; no separate Figma nodes were supplied for them.

`assets/figma/hero.png`, `verified.png`, `online-map.png` and `trip-map.png` are exported imagery from the supplied Figma design. They provide the welcome hero, verification illustration and map references. UI text, controls, state changes and navigation are implemented in React Native. Shared Albert Sans font assets originate from `packages/design-tokens/assets/fonts`; interface icons use `lucide-react-native`.

## Future backend integrations

- Authentication, secure sessions and server-backed driver profiles.
- Secure document upload/storage, verification review and authoritative approval status.
- Real availability and dispatch subscriptions, server-enforced request expiry and acceptance concurrency.
- Location permissions, tracking, maps, routing, ETA and navigation.
- Server-generated patient PINs, trip lifecycle updates and completion confirmation.
- Patient messaging, delivery/read states, calling and operator support contacts.
- Persisted trip history, fare calculation, billing, earnings and payouts.
- Offline recovery, synchronization, push notifications and operational error handling.

The store actions are the current local adapter boundary for these integrations. Preview verification and PIN values must be replaced by server-authorized behavior before live use.
