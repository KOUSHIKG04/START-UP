# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

- **Patients**: Individuals and families seeking rapid healthcare solutions, booking outpatient appointments (clinic visits, video consultations), managing family member appointments, and requesting emergency ambulance assistance.
- **Doctors**: Healthcare practitioners managing daily patient queues, consultation schedules, clinic appointments, and electronic prescriptions.
- **Emergency Drivers**: Ambulance operators receiving real-time emergency dispatch requests, patient location navigation, and hospital transport coordination.
- **Clinic / Hospital Administrators**: Operational staff managing hospital resources, doctor listings, and overall healthcare services via the web dashboard.

## Product Purpose

An integrated healthcare platform designed to bridge the entire patient care continuum—from routine doctor discovery and clinic appointment scheduling to teleconsultations and rapid emergency ambulance response—providing reliable, fast, and stress-free medical access.

## Positioning

An all-in-one care network connecting patients, doctors, and emergency response vehicles within a unified mobile-first ecosystem, eliminating the fragmentation between routine clinic visits and urgent medical care.

## Operating Context

- **Mobile Outpatient Environment**: Patients booking slots on mobile devices, often under time pressure or health discomfort, requiring high clarity, legible typography, and zero cognitive load.
- **Clinical Environment**: Doctors reviewing patient queues and consultation notes between appointments.
- **Emergency Transit**: Ambulance drivers operating in time-critical transit conditions requiring high-contrast, distraction-free interfaces.
- **Administrative Operations**: Web dashboard for multi-facility operations and scheduling management.

## Capabilities and Constraints

- **Multi-App Monorepo**: Turborepo workspace encompassing `patient-mobile` (Expo/React Native), `doctor-mobile`, `driver-mobile`, and `web` admin.
- **Design System & Primitives**: Shared `@startup/design-tokens` (colors, typography, spacing, radius) and `@startup/mobile-ui` (Button, Card, Chip, Header, FadedScrollView, TimeSlot, SearchInput).
- **Booking & Consultations**: Supports both in-person "Clinic Visit" and remote "Video Consultation" with dynamic slot selection, month/date carousels, and patient selector (Self/Family).
- **Emergency SOS Dispatch**: Integrated ambulance flow with instant location routing and status tracking.
- **Undecided Decisions**: Product brand name is currently unconfirmed ("not yet ready" pending finalization).

## Brand Commitments

- **Brand Name**: Pending decision (temporary working name in assets: Clinzo / Startup).
- **Color Palette**: Core medical teal palette with `#008877` (Primary), `#087F78` (Primary Dark), `#E6F7F6` / `#E6F5F4` (Surface & Soft Blur), and `#EF3B43` (Emergency SOS Red).
- **Typography**: Clean, accessible sans-serif typography hierarchy with clear contrast ratios for medical readability.

## Evidence on Hand

- Core mobile design tokens and color scales in `packages/design-tokens/src/colors.ts`.
- Reusable UI component library in `packages/mobile-ui/src/`.
- Working mobile app flows in `apps/patient-mobile/`, `apps/doctor-mobile/`, and `apps/driver-mobile/`.
- Medical symptom icon set in `apps/patient-mobile/assets/clinzo-symptom-icons/`.

## Product Principles

1. **Clarity Over Novelty**: In healthcare, ambiguity creates anxiety. Every action, status, and button must communicate its purpose clearly.
2. **Speed in Critical Paths**: Booking an urgent doctor or requesting an ambulance must require minimal taps with instantaneous feedback.
3. **Calm and Reassuring**: Clean spacing, harmonious teal surfaces (`#E6F7F6`), and refined typography reduce stress for patients and clinicians alike.
4. **Cohesive Ecosystem**: Patient, doctor, driver, and admin surfaces share a single unified design language and synchronized state.

## Accessibility & Inclusion

- High-contrast text labels against surfaces adhering to accessibility contrast ratios.
- Generous tap targets (minimum 44x44 points) for date chips, time slots, and action buttons.
- Distinct disabled states (`colors.disabledBackground` and `colors.disabledText`) preventing accidental interactions on unavailable slots.
