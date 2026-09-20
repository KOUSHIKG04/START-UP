# Shared data access scaffold

The TypeScript files are intentionally empty. They reserve a place for generated
database types, a client factory, and reusable Supabase queries, mutations and
subscriptions. No Supabase client, credentials or backend calls are implemented.

Each app will configure its own client and session storage. Platform-specific
storage, React hooks, providers and UI should stay outside this package. Only move
operations here when they are reusable across apps. No package dependencies or app
connections have been added yet.
