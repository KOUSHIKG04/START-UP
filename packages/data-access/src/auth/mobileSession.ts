import type { Session } from "@supabase/supabase-js";
import type { MyProfile } from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";
import { getMyProfile } from "./operations";

export type MobileSessionState = {
  loading: boolean;
  session: Session | null;
  profile: MyProfile | null;
  error: string | null;
};

// A single state source per app keeps navigation in sync with Auth and scoped profiles.
export function createMobileSession(client: AppSupabaseClient | null) {
  let state: MobileSessionState = {
    loading: Boolean(client),
    session: null,
    profile: null,
    error: client ? null : "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  };
  const listeners = new Set<() => void>();
  const emit = (next: MobileSessionState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };
  let version = 0;

  async function refresh(session: Session | null) {
    const request = ++version;
    if (!session || !client) {
      emit({ loading: false, session: null, profile: null, error: state.error });
      return;
    }
    // Keep the router mounted during a sign-in or manual refresh. Only the
    // initial session restoration blocks navigation.
    emit({ loading: state.loading, session, profile: state.profile, error: null });
    try {
      const profile = await getMyProfile(client);
      if (request === version) emit({ loading: false, session, profile, error: null });
    } catch (error) {
      if (request === version) {
        emit({
          loading: false,
          session,
          profile: null,
          error: error instanceof Error ? error.message : "Could not load your profile.",
        });
      }
    }
  }

  if (client) {
    void client.auth.getSession().then(({ data, error }) => {
      if (error) emit({ loading: false, session: null, profile: null, error: error.message });
      else void refresh(data.session);
    });
    // Supabase auth callbacks must not await another Supabase call.
    client.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      setTimeout(() => void refresh(session), 0);
    });
  }

  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    refresh: () => client?.auth.getSession().then(({ data }) => refresh(data.session)),
  };
}
