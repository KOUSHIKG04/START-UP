# Dependency patches

pnpm applies the patches registered in `pnpm-workspace.yaml` during installation.
Commit each patch together with its workspace registration and lockfile changes.

## Expo Router 57.0.24 initial native link

`expo-router@57.0.24.patch` fixes an initial-URL lifecycle race in the native
`useLinking` hook used by Patient, Doctor and Driver. The initial state is read
during render, but Router also updates unhandled-link tracking from that lookup.
A pending Android URL can resolve before commit and trigger React's
"hasn't mounted yet" warning. The same callback can run after unmount.

The patch keeps initial navigation-state resolution intact. It registers link
tracking from an effect, cancels pending delivery on cleanup, and avoids restoring
a link already handled by the current route. Live URL subscriptions and their
cleanup stay unchanged. Logging is not suppressed.

The same problem is documented in
[Expo issue #47659](https://github.com/expo/expo/issues/47659). The published
57.0.28 native handler still contained the same callback when checked on
2026-10-19, so a patch-version upgrade alone did not supply this fix.

Run the regression tests against the installed package:

```sh
node --test apps/patient-mobile/tests/expo-router-linking.test.cjs
```

The test delays effects to exercise initial URLs before commit, after commit,
after cleanup and during Strict Mode effect replay. It also checks synchronous
URLs, already-handled links, live URL navigation, disabled linking and lookup
errors. The pre-commit case runs against each mobile app's installed Router.
These are deterministic hook tests; Android startup and reload still require
device verification.

When upgrading Router, inspect its native initial-link implementation and rerun
the tests before removing or rebasing this patch. Restart Metro with `--clear`
after applying it. This JavaScript change does not require a new development APK.
