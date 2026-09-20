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

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Edit the dashboard feature screen to update the existing page. Keep route files thin.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
