"use client";

import { useActionState, useEffect } from "react";
import { signIn } from "@/lib/auth-actions";
import { Button } from "@startup/web-ui/components/ui/button";
import { Input } from "@startup/web-ui/components/ui/input";
import { Label } from "@startup/web-ui/components/ui/label";
import { toast } from "@startup/web-ui/components/ui/toast";

export function LoginForm({ serverError }: { serverError?: string }) {
  
  const [state, action, pending] = useActionState(signIn, {
    error: null as string | null,
  });
  useEffect(() => {
    if (state.error) toast.add({ title: "Sign in failed", description: state.error, type: "error" });
  }, [state.error]);
  useEffect(() => {
    if (serverError) toast.add({ title: "Sign in unavailable", description: serverError, type: "error" });
  }, [serverError]);

  return (
    <form action={action} className="mt-7 space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <Button className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
