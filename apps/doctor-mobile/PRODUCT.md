# Doctor mobile

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users and purpose

Doctors manage appointments, look up patients, conduct clinic, online and home visits, write clinical notes and prescriptions, and manage availability and schedules.

## Capabilities and constraints

The user confirmed local demo data and working screen flows. No backend, patient messaging service, video service, authentication or clinical signing service is connected. Demo state lasts for the app session. Onboarding and login are outside this request.

## Brand commitments

Use the same lucide-react-native icon library as patient-mobile. The user explicitly rejected exported Figma icons.

Implement the supplied START-UP Figma doctor frames. Follow the patient-mobile Expo Router structure and reuse the mobile-ui and design-tokens packages. Replace the patient SOS center action with Scan QR. All app-specific code belongs in doctor-mobile.

## Evidence

Figma file JPyiy9pnS8Ywy9SlSyGUqu: Home 746:594; appointments 746:499; notes 760:711; prescription 760:1015 (discovered beside notes); online 760:898; chat 760:916; home visit 767:1119; profile 782:12; schedule 779:10.

## Open decisions

Production integration, identity reconciliation (Home says Ananya; Profile says Priya), authentication and real clinical workflows remain undecided. Preserve the supplied per-screen demo copy.
