# Doctor mobile

Expo / React Native doctor app, following the patient app's route and screen structure. Icons use `lucide-react-native`, as in patient-mobile.

From the workspace root:

```sh
pnpm dev:doctor
pnpm --filter doctor-mobile typecheck
pnpm --filter doctor-mobile test
```

## Structure

- `src/app/(tabs)`: thin Expo Router routes and shared bottom navigation.
- `src/screens`: Home, appointments, clinical notes, prescription, online consultation, chat, home visit, profile, schedule, and QR lookup.
- `src/components`: doctor screen/header helpers and patient cards built on shared mobile UI.
- `src/data`, `src/types`, `src/store`, `src/utils`: demo fixtures, typed visit models, session state, lookup and schedule logic.
- `../../packages/mobile-ui` and `../../packages/design-tokens`: shared controls, navigation, Albert Sans, and theme tokens.

## Demo flows

Home → Start Consultation → clinical notes → Write Prescription. Add/edit/remove medicines, adjust meal doses and food timing, choose a follow-up date, and sign a local demo prescription. Complete Consultation marks the visit complete and makes its notes read-only.

Appointments starts on the Figma fixture date, 5 August 2026. Filter by visit type. The home visit is on 6 August; the Home Visit filter offers a shortcut to that date. Online appointments open the call preview and its chat/notes flow.

The central Scan QR action reads patient IDs such as `CLZ-0001`, or JSON such as `{"patientId":"CLZ-0001"}`. Camera permission is requested only after pressing Open camera. Manual lookup works without a camera. Meera's demo home-visit PIN is `1234`.

Schedule changes update the slot preview and save to the app session. Profile actions open local settings/details; Logout offers a demo reset.

## Scope

The user requested local demo data and working screen flows. State is in memory and resets on reload. No backend, authentication, video transport, phone service, patient message delivery, clinical signature, or payment service is connected. The call controls simulate local UI state. Signing saves locally and sends nothing. Onboarding/login are intentionally outside this implementation.

The map is the supplied Figma image; it is not live location tracking. Start navigation opens the displayed destination in maps.

## Design references

START-UP file `JPyiy9pnS8Ywy9SlSyGUqu`: Home `746:594`, appointments `746:499`, notes `760:711`, online `760:898`, chat `760:916`, home visit `767:1119`, profile `782:12`, schedule `779:10`. The prescription link duplicated notes; the adjacent Writing Prescription frame `760:1015` was used. Home's Ananya and Profile's Priya labels preserve the supplied screen copy pending identity reconciliation.

`assets/figma/map.png` was downloaded unchanged from the home-visit frame's exported image asset `5961f507-d0be-4873-9dc3-bdbe2a3a2320`. No Figma icon exports are used.
