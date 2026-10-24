import { useEffect, useState } from "react";
import {
  getMyPatientVerificationPin,
  subscribeAppChanges,
} from "@startup/data-access";
import { AppState } from "react-native";
import { supabase, useMobileSession } from "../../../services/supabase";

export function useProfilePin() {
  const { profile } = useMobileSession();
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const patientId = profile?.patient_id;

  useEffect(() => {
    const client = supabase;
    if (!showPin || !client || !patientId) {
      setPin(null);
      setLoading(false);
      setUnavailable(false);
      return;
    }
    let current = true;
    let inFlight = false;
    let again = false;
    const load = async () => {
      if (!current) return;
      if (AppState.currentState !== "active") {
        again = true;
        return;
      }
      if (inFlight) {
        again = true;
        return;
      }
      inFlight = true;
      again = false;
      if (current) setLoading(true);
      try {
        const value = await getMyPatientVerificationPin(client, patientId);
        if (current) {
          setPin(value);
          setUnavailable(false);
        }
      } catch {
        if (current) {
          setPin(null);
          setUnavailable(true);
        }
      } finally {
        inFlight = false;
        if (current) setLoading(false);
        if (current && again) {
          again = false;
          void load();
        }
      }
    };
    void load();
    const cleanup = profile?.identity_id
      ? subscribeAppChanges(
          client,
          { identityId: profile.identity_id },
          {
            onChange: (change) => {
              if (change.kind === "profile") void load();
            },
            onConnected: () => {
              void load();
            },
          }
        )
      : () => {};
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") void load();
    });
    return () => {
      current = false;
      appState.remove();
      cleanup();
    };
  }, [patientId, showPin, profile?.identity_id]);

  const digits = Array.from({ length: 4 }, (_, index) => pin?.[index] ?? "");

  return { showPin, setShowPin, pin, setPin, loading, unavailable, digits };
}
