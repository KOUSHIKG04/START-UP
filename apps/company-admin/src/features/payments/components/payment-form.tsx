"use client";

import { useActionState } from "react";
import { Button } from "@startup/web-ui/components/ui/button";
import { changeCompanyPayments } from "../server/actions";

export function PaymentForm({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  const [state, action, pending] = useActionState(changeCompanyPayments, {
    error: "",
    success: "",
  });
  return (
    <form action={action} className="space-y-3">
      <fieldset disabled={pending} className="space-y-3">
        {children}
        <Button
          type="submit"
          disabled={pending}
          className="h-auto min-h-10 text-left whitespace-normal"
        >
          {pending ? "Updating…" : label}
        </Button>
      </fieldset>
      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-muted-foreground text-sm">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
