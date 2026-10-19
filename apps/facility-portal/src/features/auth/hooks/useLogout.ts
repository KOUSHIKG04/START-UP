"use client";
import { useActionState, useEffect } from "react";
import { toast } from "@startup/web-ui/components/ui/toast";
import { logout } from "../server/actions";
export function useLogout() {
  const [state, action, pending] = useActionState(logout, { error: null });
  useEffect(() => {
    if (state.error)
      toast.add({
        title: "Logout failed",
        description: state.error,
        type: "error",
      });
  }, [state]);

  return { action, pending };
}
