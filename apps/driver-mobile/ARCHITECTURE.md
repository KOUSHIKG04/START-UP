# Driver mobile architecture

- src/app: Expo Router layouts and route adapters.
- src/features: screens, feature components, helpers and future API/hooks.
- src/components: shared app UI.
- src/stores: existing cross-feature Zustand stores.
- src/services: empty Supabase, notification and location integration files.
- src/providers: reserved for future app-wide providers.
- src/types, src/hooks, src/utils: cross-feature code only.

Existing route URLs, callbacks, tab membership and screen behavior are preserved.
Route groups do not change URLs. Existing hidden tab routes are deliberately retained
to preserve their bottom navigation and back behavior. They can be moved into stacks
as a separate navigation change.

Registration routes live in (auth). The existing driver verification gate remains in the tab layout; chat also retains its own screen checks.

The shared backend scaffold is at /supabase in the repository. Shared contracts and
data operations belong in packages/contracts and packages/data-access. These are
not connected yet. Each mobile app will configure its own session storage and client.
Do not introduce server credentials into app code.
