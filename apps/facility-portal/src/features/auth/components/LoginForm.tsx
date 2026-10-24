"use client";

import { useLogin } from "../hooks/useLogin";

import { useFormStatus } from "react-dom";
import Link from "next/link";
import { cn } from "cn";
import { Button } from "@startup/web-ui/components/ui/button";
import { Card, CardContent } from "@startup/web-ui/components/ui/card";
import { Input } from "@startup/web-ui/components/ui/input";
import { Label } from "@startup/web-ui/components/ui/label";

import { loginContent } from "../utils/loginConstants";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { action } = useLogin();
  return (
    <div className={cn("w-full", className)} {...props}>
      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="mb-7 space-y-1 text-center">
            <h1 className="text-2xl font-semibold">{loginContent.heading}</h1>
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
            <Link
              href="/register"
              className="text-foreground font-medium underline underline-offset-4"
            >
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
