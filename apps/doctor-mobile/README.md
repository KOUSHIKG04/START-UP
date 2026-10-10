# Doctor mobile

Expo / React Native doctor app, following the patient app's route and screen structure. Icons use `lucide-react-native`, as in patient-mobile.

Phone OTP, credential onboarding/review gating, and the separate **Clinic operations** route now use the shared Supabase backend. The older home statistics, patient cards, schedule, prescription and home-visit screens are still design previews. Set this app's `.env.local` from `.env.example`; setup and current deployment blockers are in [mobile-backend-integration.md](../../plans/mobile-backend-integration.md).

From the workspace root:

```sh
pnpm dev:doctor
pnpm --filter doctor-mobile typecheck
pnpm --filter doctor-mobile test
```

## Clinic map selection

Independent-clinic onboarding offers **Choose on map** inside the address drawer.
Search an address or pan the map under the pin, then confirm to populate the address draft.
Only **Save Profile** persists the practice address and coordinates through existing APIs.

Android requires `GOOGLE_MAPS_ANDROID_API_KEY` in `.env.local` and the EAS development
environment. Enable Maps SDK for Android and restrict the key to
`com.clinzo.doctor.dev` and its development signing SHA-1. The native `expo-maps`
module requires a new development APK. iOS uses Apple Maps.

```powershell
cd C:\startup\apps\doctor-mobile
pnpm exec eas build --platform android --profile development
```

Without a configured native map, GPS/manual address entry remains available in
the drawer. Address lookup failures keep the selected coordinates and require
manual address completion before saving.

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

Legacy demo screens still keep state in memory and reset on reload. Their call controls simulate local UI state, and their signing sends nothing. Use the separately labelled Clinic operations route for live appointment actions; phone OTP delivery requires a configured SMS provider.

The map is the supplied Figma image; it is not live location tracking. Start navigation opens the displayed destination in maps.

## Design references

START-UP file `JPyiy9pnS8Ywy9SlSyGUqu`: Home `746:594`, appointments `746:499`, notes `760:711`, online `760:898`, chat `760:916`, home visit `767:1119`, profile `782:12`, schedule `779:10`. The prescription link duplicated notes; the adjacent Writing Prescription frame `760:1015` was used. Home's Ananya and Profile's Priya labels preserve the supplied screen copy pending identity reconciliation.

`assets/figma/map.png` was downloaded unchanged from the home-visit frame's exported image asset `5961f507-d0be-4873-9dc3-bdbe2a3a2320`. No Figma icon exports are used.

## Personal Home locations

The Home address opens the Patient-style saved-address picker: current location,
map selection/search, add, edit, delete, and selection. Addresses persist through
doctor-owned RPCs in `20261010143000_doctor_personal_locations.sql`. They do not
change approved practices, clinic addresses, published slots, or patient discovery.
Current location opens the map; a record is saved only after Save Address.

Manual check: tap the Home address, add a map location and address, save, and
return Home. Reopen to edit/delete or select another address. Restart the app to
confirm persistence. Check Hospital Settings / Manage Schedule to confirm the
approved practice is unchanged. Edit Clinic now shows every address field on
its page. The Settings entry is a Profile row.

Database regression: `packages/database/tests/doctor-personal-locations.cli-smoke.sql`
uses rollback-only fixtures for CRUD, selected-address fallback, and doctor isolation.

### Personal address vs. practice address

Doctor onboarding and Edit Profile collect a structured Personal Address. This reuses
`doctor_saved_location` with one stable `is_profile_address` record per doctor, separate
from the Home header's selected place. Profile/address edits commit together through
`save_my_doctor_profile_with_address`; only the signed-in doctor can read their personal
address. Existing doctors can add it through Edit Profile. Existing addresses are not
silently assigned as residential addresses.

Independent clinic owners still enter a separate Clinic Address and select its map
coordinates. Associated doctors use the registered facility address. Personal-address
edits never change clinic coordinates, patient discovery/distance or clinic schedules.

Manual check: save a personal address in one city and a clinic in another; reload
Profile and Edit Profile, then change the Home header's saved location. The personal
address must persist independently, and Patient App must still show the clinic address.
