"use client";
import type { LoginFormProps } from "../types/login-form";
import { useActionState, useEffect } from "react";
import { signIn } from "../server/actions";
import { toast } from "@startup/web-ui/components/ui/toast";
export function useLogin({ serverError }: LoginFormProps) {
  const [state, action, pending] = useActionState(signIn, {
    error: null as string | null,
  });
  useEffect(() => {
    if (state.error)
      toast.add({
        title: "Sign in failed",
        description: state.error,
        type: "error",
      });
  }, [state.error]);
  useEffect(() => {
    if (serverError)
      toast.add({
        title: "Sign in unavailable",
        description: serverError,
        type: "error",
      });
  }, [serverError]);

  return { action, pending };
}
