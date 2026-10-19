import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { useToast } from "@startup/mobile-ui";
import { signOutWithPushCleanup } from "../../notifications/services/deviceNotifications";
import { useDoctorStore } from "../../../stores/useDoctorStore";
export function useDoctorSettings() {
  const [logout, setLogout] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const mounted = useRef(false);
  const { showToast } = useToast();
  const reset = useDoctorStore((s) => s.reset);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const result = await signOutWithPushCleanup();
      if (result?.error) throw result.error;
      reset();
      router.replace("/");
    } catch (cause) {
      if (mounted.current)
        showToast({
          title: "Could not sign out",
          message: cause instanceof Error ? cause.message : "Try again.",
          type: "error",
        });
    } finally {
      if (mounted.current) setSigningOut(false);
    }
  }

  return { logout, setLogout, signingOut, signOut };
}
