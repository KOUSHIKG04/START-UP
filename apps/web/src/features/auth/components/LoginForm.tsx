"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "cn";
import { Button } from "@startup/web-ui/components/ui/button";
import { Card, CardContent } from "@startup/web-ui/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@startup/web-ui/components/ui/field";
import { Input } from "@startup/web-ui/components/ui/input";
import { signIn, type LoginState } from "../server/actions";
import { loginContent } from "../utils/loginConstants";

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const [state, action] = useActionState<LoginState, FormData>(signIn, { error: null });
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="p-0">
          <form action={action} className="p-6 sm:p-8">
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">{loginContent.heading}</h1>
                <p className="text-balance text-muted-foreground">{loginContent.description}</p>
              </div>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" name="email" type="email" autoComplete="email" placeholder={loginContent.emailPlaceholder} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input id="password" name="password" type="password" autoComplete="current-password" required />
              </Field>
              {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
              <Field><LoginButton /></Field>
              <FieldDescription className="text-center">Access is provisioned by your hospital or clinic administrator.</FieldDescription>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function LoginButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>;
}
