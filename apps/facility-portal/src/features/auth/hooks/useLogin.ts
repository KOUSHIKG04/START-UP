"use client";

import { useActionState, useEffect } from "react";
import { toast } from "@startup/web-ui/components/ui/toast";
import { signIn } from "../server/actions";
import { type LoginState } from "../types/actions";

export function useLogin() {
  const [state, action] = useActionState<LoginState, FormData>(signIn, {
    error: null,
  });
  useEffect(() => {
    if (state.error)
      toast.add({
        title: "Sign in failed",
        description: state.error,
        type: "error",
      });
  }, [state.error]);

  return { action };
}
