"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { cn } from "cn";
import { Button } from "@startup/web-ui/components/ui/button";
import { Card, CardContent } from "@startup/web-ui/components/ui/card";
import { Input } from "@startup/web-ui/components/ui/input";
import { Label } from "@startup/web-ui/components/ui/label";
import { toast } from "@startup/web-ui/components/ui/toast";
import { loginContent } from "../utils/loginConstants";
import { signIn, type LoginState } from "../server/actions";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [state, action] = useActionState<LoginState, FormData>(signIn, {
    error: null,
  });
  useEffect(() => {
    if (state.error) toast.add({ title: "Sign in failed", description: state.error, type: "error" });
  }, [state.error]);

  return (
    <div className={cn("w-full", className)} {...props}>
      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="mb-7 space-y-1 text-center">
            <h1 className="text-2xl font-semibold">{loginContent.heading}</h1>
            <p className="text-muted-foreground text-sm">
              {loginContent.description}
            </p>
          </div>

          <form action={action} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder={loginContent.emailPlaceholder}
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
            <SignInButton />
          </form>

          <p className="text-muted-foreground mt-6 text-center text-sm">
            New hospital or clinic?{" "}
            <Link href="/register" className="text-foreground font-medium underline underline-offset-4">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function SignInButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}
