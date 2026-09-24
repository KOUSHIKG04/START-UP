# Web admin

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
Run `pnpm --filter web check:architecture` to detect duplicate route URLs and
incorrect imports, and `pnpm --filter web test:architecture` to test these guards.

## Portal setup

1. Apply and review the pending Supabase migrations in a non-production project. The
   linked development project currently has only the three baseline migrations; the
   inventory RPCs are not available there yet.
2. Copy `.env.example` to `.env.local` and set the project URL and **publishable**
   key from Supabase Connect. Never put a database password or service-role key in
   `NEXT_PUBLIC_*` variables.
3. Enable Supabase email/password Auth. Provision the portal user's Auth account and
   link it to an active Clinzo identity and authorized facility membership. The
   portal intentionally has no public staff signup.
4. Run `pnpm --filter web dev` from the repository root and open `/login`. A member
   can then select an authorized facility at `/bed-management` and update aggregate
   bed counts. Receptionists can read inventory; owners and authorized admins can
   write. The RPC enforces these scopes.

The other admin screens still use demo data. No bed count is an individual patient
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
