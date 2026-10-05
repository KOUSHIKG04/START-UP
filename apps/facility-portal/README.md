# Facility portal

Read [ARCHITECTURE.md](./ARCHITECTURE.md) for folder ownership, feature conventions,
server boundaries, and the future shared backend integration contract.

The existing dashboard lives in `src/features/dashboard/screens/DashboardScreen.tsx`.
Its route adapters are `src/app/(admin)/page.tsx` and
`src/app/(admin)/dashboard/page.tsx`; the URLs remain `/` and `/dashboard`.
The admin route group owns the shared shell. Login belongs to `(auth)` and the
auth feature. Screen data lives in each feature's `utils/*Constants.ts` files.
See the architecture guide for all current route and feature mappings.

Routes import feature entry points (`@/features/doctors`, for example). Each feature
owns its screens, components, hooks, types and `utils/*Constants.ts`. Shared admin
navigation lives in `src/components/admin`; generic primitives live in web-ui.
Run `pnpm --filter facility-portal check:architecture` to detect duplicate route URLs and
incorrect imports, and `pnpm --filter facility-portal test:architecture` to test these guards.

## Portal setup

1. Apply and review the Supabase migrations in a non-production project before
   pointing the portal at it. The disposable test project currently contains
   the facility registration and doctor-association RPCs.
2. Copy `.env.example` to `.env.local` and set the project URL and **publishable**
   key from Supabase Connect. Never put a database password or service-role key in
   `NEXT_PUBLIC_*` variables. To fill the facility address from browser location,
   enable Google Geocoding API and set `GOOGLE_GEOCODING_API_KEY` in this app's
   `.env.local` (server-side only). Restart the dev server after changing it.
   Without that key, location coordinates can still be captured and the address
   entered manually.
3. Enable Supabase email/password Auth with email confirmation. A new hospital or
   clinic owner can use `/register`, confirm the email, sign in, and register one
   facility at `/facility-verification` while physically at its location. Enter
   street address, locality, city, state and pincode separately; "Use current
   location" captures coordinates and fills available address parts when
   Geocoding is configured. The registration starts pending. Upload its
   registration certificate and operating
   licence on that page; a Clinzo company reviewer approves the facility case.
   Existing staff memberships remain provisioned by an authorized administrator;
   public signup never grants a receptionist or admin role at another facility.
4. Run `pnpm --filter facility-portal dev` from the repository root and open `/login`. A member
   can then select an authorized facility at `/bed-management` and update aggregate
   bed counts. Receptionists can read inventory; owners and authorized admins can
   write. The RPC enforces these scopes.

At `/doctor-management`, a facility owner/admin sees doctors who selected that
verified facility in the Doctor app and can accept or decline each request. The
existing Add Doctor card can instead send an invitation to a doctor who has a
Clinzo profile; that doctor accepts from Doctor App → Profile → Hospital Settings.
A link to the hospital practice becomes active only after both the facility-side
acceptance and Clinzo's doctor credential verification. A doctor operating their
own clinic uses the separate solo-clinic onboarding path and needs company doctor
document approval, not an unrelated hospital's approval. Changes are applied by
`20261003050104_facility_doctor_association.sql` and
`20261003051957_facility_doctor_invitations.sql` and
`20261003053213_atomic_doctor_facility_claim.sql`. Pending hospital
registrations stay out of patient ambulance destinations until company
approval (`20261003053906_gate_unverified_hospital_destinations.sql`).

No bed count is an individual patient
admission or a reservation guarantee.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
