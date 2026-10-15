import { useCallback, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  getMyVerificationCase,
  hasMyDoctorClaim,
  type MyVerificationCase,
  subscribeAppChanges,
} from "@startup/data-access";
import {
  mobileSession,
  supabase,
  useMobileSession,
} from "../../../services/supabase";

export function useDoctorVerification({
  refreshSession = true,
}: { refreshSession?: boolean } = {}) {
  const { profile } = useMobileSession();
  const [submitted, setSubmitted] = useState<boolean | null>(null);
  const [review, setReview] = useState<MyVerificationCase | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const active = useRef(false);
  const checking = useRef(false);
  const again = useRef(false);
  const refresh = useCallback(
    async (quiet = false, updateSession = refreshSession) => {
      if (!supabase || !active.current) return;
      if (checking.current) {
        again.current = true;
        return;
      }
      checking.current = true;
      if (!quiet) setRefreshing(true);
      try {
        const [claim, current] = await Promise.all([
          hasMyDoctorClaim(supabase),
          profile?.doctor?.id
            ? getMyVerificationCase(supabase, "doctor", profile.doctor.id)
            : Promise.resolve(null),
        ]);
        if (!active.current) return;
        setSubmitted(claim);
        setReview(current);
        setError("");
        if (updateSession) await mobileSession.refresh();
      } catch (cause) {
        if (active.current)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not refresh verification status."
          );
      } finally {
        checking.current = false;
        if (active.current) {
          setRefreshing(false);
          setLoading(false);
        }
        if (active.current && again.current) {
          again.current = false;
          void refresh(true, false);
        }
      }
    },
    [profile?.doctor?.id, refreshSession]
  );
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      void refresh();
      const cleanup =
        supabase && profile?.identity_id
          ? subscribeAppChanges(
              supabase,
              { identityId: profile.identity_id },
              {
                onChange: (change) => {
                  if (
                    change.kind === "profile" &&
                    AppState.currentState === "active"
                  )
                    void refresh(true, false);
                },
                onConnected: () => {
                  if (AppState.currentState === "active")
                    void refresh(true, false);
                },
              }
            )
          : () => {};
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") void refresh(true);
      });
      return () => {
        active.current = false;
        cleanup();
        subscription.remove();
      };
    }, [refresh, profile?.identity_id])
  );
  return { profile, submitted, review, error, loading, refreshing, refresh };
}
