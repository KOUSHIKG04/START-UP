import { useCallback, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { getMyVerificationCase, hasMyDoctorClaim, type MyVerificationCase } from "@startup/data-access";
import { mobileSession, supabase, useMobileSession } from "../../../services/supabase";

export function useDoctorVerification({ refreshSession = true, pollIntervalMs = 10000 }: { refreshSession?: boolean; pollIntervalMs?: number } = {}) {
  const { profile } = useMobileSession();
  const [submitted, setSubmitted] = useState<boolean | null>(null);
  const [review, setReview] = useState<MyVerificationCase | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const active = useRef(false);
  const checking = useRef(false);
  const verified = useRef(false);
  const refresh = useCallback(async (quiet = false) => {
    if (!supabase || checking.current || !active.current) return;
    checking.current = true;
    if (!quiet) setRefreshing(true);
    try {
      const [claim, current] = await Promise.all([
        hasMyDoctorClaim(supabase),
        profile?.doctor?.id ? getMyVerificationCase(supabase, "doctor", profile.doctor.id) : Promise.resolve(null),
      ]);
      if (!active.current) return;
      setSubmitted(claim);
      setReview(current);
      verified.current = current?.status === "verified";
      setError("");
      if (refreshSession) await mobileSession.refresh();
    } catch (cause) {
      if (active.current) setError(cause instanceof Error ? cause.message : "Could not refresh verification status.");
    } finally {
      checking.current = false;
      if (active.current) { setRefreshing(false); setLoading(false); }
    }
  }, [profile?.doctor?.id, refreshSession]);
  useFocusEffect(useCallback(() => {
    active.current = true;
    void refresh();
    const interval = setInterval(() => { if (AppState.currentState === "active" && !verified.current) void refresh(true); }, pollIntervalMs);
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void refresh(true); });
    return () => { active.current = false; clearInterval(interval); subscription.remove(); };
  }, [refresh, pollIntervalMs]));
  return { profile, submitted, review, error, loading, refreshing, refresh };
}
