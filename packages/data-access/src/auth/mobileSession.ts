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
    error: client
      ? null
      : "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  };
  const listeners = new Set<() => void>();
  let started = false;
  const emit = (next: MobileSessionState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };
  let version = 0;

  async function refresh(session: Session | null) {
    const request = ++version;
    if (!session || !client) {
      emit({
        loading: false,
        session: null,
        profile: null,
        error: client ? null : state.error,
      });
      return;
    }
    const sameAccount = state.session?.user.id === session.user.id;
    // A failed lookup is not a missing profile. Block route decisions during
    // first sign-in, account switches and retries; preserve settled same-user
    // navigation during ordinary background refreshes.
    emit({
      loading:
        state.loading ||
        !sameAccount ||
        (Boolean(state.error) && !state.profile),
      session,
      profile: sameAccount ? state.profile : null,
      error: null,
    });
    try {
      const profile = await getMyProfile(client);
      if (request === version)
        emit({ loading: false, session, profile, error: null });
    } catch (error) {
      if (request === version) {
        emit({
          loading: false,
          session,
          profile: sameAccount ? state.profile : null,
          error:
            error instanceof Error
              ? error.message
              : "Could not load your profile.",
        });
      }
    }
  }

  function start() {
    if (!client || started) return;
    started = true;
    const restorationVersion = version;
    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (restorationVersion !== version) return;
        if (error)
          emit({
            loading: false,
            session: null,
            profile: null,
            error: error.message,
          });
        else void refresh(data.session);
      })
      .catch((error: unknown) => {
        if (restorationVersion !== version) return;
        emit({
          loading: false,
          session: null,
          profile: null,
          error:
            error instanceof Error
              ? error.message
              : "Could not restore your session.",
        });
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
      // useSyncExternalStore subscribes after the component commits. Starting
      // Auth here avoids publishing session updates during the first render.
      start();
      return () => listeners.delete(listener);
    },
    refresh: async () => {
      if (!client) return;
      const sessionVersion = version;
      try {
        const { data, error } = await client.auth.getSession();
        if (sessionVersion !== version) return;
        if (error) throw error;
        await refresh(data.session);
      } catch (error) {
        if (sessionVersion !== version) return;
        emit({
          ...state,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Could not restore your session.",
        });
      }
    },
  };
}
