# Driver mobile architecture

## Manual refresh

Home, earnings/trip history, current trip, profile and notifications support
pull-to-refresh using existing feature queries. `DriverUI.Body` accepts an
optional refresh callback; profile and notification scroll views use the same
shared themed indicator. Manual refresh preserves period selections, availability
actions and trip PIN input and does not request location permissions or change
tracking subscriptions. Native Android/iOS gesture verification remains pending.

Follow the repository [ownership map](../../ARCHITECTURE.md) and
[working rules](../../AGENTS.md). Existing integrations must be inspected before
implementing new Driver functionality.

## Current ownership

- `src/app`: Expo Router layouts, registration/verification gates, tabs, and route
  adapters. Preserve paths, parameters, tab membership, and back behavior.
- `features/auth`: individual registration screens, address components, local
  types, and registration display constants. `screens/RegistrationScreens.tsx`
  preserves existing named exports for route callers.
- `features/home`: driver availability, fleet/offer/trip summary, and offer actions.
  `hooks/useDriverHome.ts` retains query/action/timer coordination;
  `components/DriverOfferDialog.tsx` renders the request UI.
- `features/trips`: active trip stages and trip chat screens. `useDriverTrip` owns
  trip actions and PIN/completion state; `utils/tripConstants.ts` owns the existing
  stage labels and next-action display mapping. The owner is `trips` (plural).
- `features/locations`: saved driver locations, selection, drafts, and geocoding.
  Registration and saved-address pickers share `utils/mapPicker.ts`, local map
  types, and `LocationPicker.styles.ts`. They retain their different draft stores
  and confirmation routes; their map controllers and effects are not merged.
- `features/tracking`: location reporting and background location task integration.
- `features/profile`, `features/earnings`: driver profile and earnings UI.
- `features/notifications`: device push registration and notification interactions.
  Its `components/NotificationDrawer.tsx` composes the shared `mobile-ui` drawer;
  `hooks/useNotificationDrawer.ts` keeps notification queries, mutations, cache
  updates and Driver copy. Adapter props live in feature `types/notifications.ts`;
  the time formatter comes from contracts.
- `src/components`: app-wide presentation; generic UI comes from `mobile-ui`.
- `src/services`, `src/providers`, `src/stores`: existing mobile client/session,
  live updates, query provider, and app UI/draft state.

## Shared operations and lifecycle

Neutral cards use `surfaces.card` from `@startup/design-tokens`: a 0.4 light gray
border combined with `shadows.card`. The Profile screen composes the shared
`mobile-ui` Card for separate action rows, using the same 64px height, themed icon
circles and semibold labels as Patient and Doctor. `DriverUI` keeps its existing
Card adapter for other screens, with the same surface preset through `ui.card`.

Backend adapters already exist for onboarding, saved locations, driver fleet and
profile, availability/offers, trips, tracking, and SOS. Their reusable operations
are in `packages/data-access/src/ambulance` and the driver location modules, with
corresponding contracts in `packages/contracts`. These are implementation starting
points, not proof that every end-to-end workflow is complete or device-verified.

Use the existing session and query cache. Keep device permission acquisition,
saved-address selection, geocoding, tracking, and map rendering distinct. Preserve
the current permission flow, task registration, subscription ownership, cleanup,
offer expiry, and trip transitions when extracting hooks or components. Test
foreground/background tracking and notification behavior on a device when changed.

Use feature-local hooks, components, types, and `utils/*Constants.ts` only when
there is real code for them. Do not implement another location/notification service
because an old scaffold used that path. Empty mobile service files, `.gitkeep`
markers, unused scaffold directories, and the abandoned singular `trip` directory
have been removed after a reference check.

`tests/live-workflows.test.cjs` exercises the extracted live hooks and map-picker
boundaries with mocked platform/backend adapters. The existing Driver store tests
remain in `tests/driver.test.mjs`; the app's `test` command runs both. These tests do
not establish device permission, background tracking, or deployed backend behavior.

## Feature ownership review

See [FEATURE_STRUCTURE.md](FEATURE_STRUCTURE.md) for the file-by-file review and
verification limits. Screens compose feature UI; hooks own workflow coordination,
named contracts live in feature types, and static display lists live in feature
constants. Platform services and navigation draft stores have separate owners.

Registration, profile, earnings, chat and both map pickers have dedicated feature
hooks. `tracking/components/DriverLocationReporter.tsx` calls the existing effect
through `tracking/hooks/useDriverLocationReporter.ts`. The background task service
remains a root-layout side-effect import, with its module-level registration and
original task name. Location services and the two independent navigation draft
stores live under `locations/services` and `locations/stores`. Notification SDK
setup and the listener hook live under their feature services and hooks.

## Trip payments, commission and earnings

`features/earnings/hooks/useDriverEarnings.ts` reads the driver's paginated payout
ledger through `list_payout_entries`, separately from the existing trip-history
query. `EarningsScreen` shows actual receipts, company commission, provider share,
recipient and payout status. The current page window is refreshed periodically;
loading more uses the shared cursor API. Income is not inferred from a new fare
formula or fabricated trip totals.

`trip-payment/[id]` composes `features/trips/screens/TripPaymentScreen.tsx` and its
`TripPayment` panel. The completed-trip history provides a route back to billing.
Company finance must set the final fare after completion; Driver can then confirm
cash actually received, with a note and the current expected amount. Shared
ambulance contracts/data-access own backend calls. Payment does not gate emergency
dispatch or trip care. An unresolved Checkout order blocks duplicate cash
collection; closing Checkout does not cancel it. Historical cash receipts remain
readable after billing is disabled.

Company finance configures commissions and the legally agreed driver/operator
payee through Dashboard-assisted Route onboarding. Driver collects no bank/KYC
details or provider secrets. Cash makes company commission receivable; finance
separately records commission received using a unique receipt. There is no automatic
cash split/debit. Gateway payouts require completed care, the configured release
delay, verified Route activation and server/database gates. Rates and recipients
are frozen per captured receipt; UI status does not promise a settlement date.

Ambulance refunds currently reconcile provider Dashboard refunds, with no in-app
self-service refund workflow. Both new payment migrations and updated functions
are deployed, including the follow-up ambulance worker alias fix. Marketplace
collections and Route transfers remain disabled in test mode. Mocked provider and rollback
SQL checks do not verify native UI, provider sandbox or actual transfers. Follow
the [payment guide](../../APPOINTMENT_RECOVERY_PAYMENTS.md) for activation and the
guarded verification runner.
