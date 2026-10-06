"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@startup/web-ui/components/ui/toast";
import { Button } from "@startup/web-ui/components/ui/button";
import { Input } from "@startup/web-ui/components/ui/input";
import { Label } from "@startup/web-ui/components/ui/label";
import { Textarea } from "@startup/web-ui/components/ui/textarea";
import { reviewDocument, finalizeCase } from "./actions";

export function DocumentActions({
  caseId,
  documentId,
}: {
  caseId: string;
  documentId: string;
}) {

  const [state, action, pending] = useActionState(
    reviewDocument.bind(null, caseId, documentId),
    { error: null, success: null }
  );

  useReviewToast(state);
  
  return (
    <form action={action} className="mt-4 flex flex-wrap items-end gap-3">
      <div className="min-w-[220px] flex-1 space-y-1">
        <Label htmlFor={`reason-${documentId}`}>Rejection reason</Label>
        <Textarea
          id={`reason-${documentId}`}
          name="reason"
          rows={2}
          minLength={10}
          maxLength={1000}
          placeholder="Explain what to replace or correct"
        />
      </div>
      <Button
        name="decision"
        value="rejected"
        variant="outline"
        disabled={pending}
      >
        Reject
      </Button>
      <Button name="decision" value="approved" disabled={pending}>
        Approve
      </Button>
    </form>
  );
}

export function FinalizeAction({
  caseId,
  subjectType,
}: {
  caseId: string;
  subjectType: string;
}) {
  const [state, action, pending] = useActionState(
    finalizeCase.bind(null, caseId, subjectType),
    { error: null, success: null }
  );
  useReviewToast(state);
  return (
    <form action={action} className="space-y-4">
      {subjectType === "driver" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            name="license_number"
            label="Reviewed driving licence number"
            required
          />
          <Field
            name="license_expires_on"
            label="Driving licence expiry (DD-MM-YYYY)"
            placeholder="DD-MM-YYYY"
            required
          />
          <Field
            name="inspection_expires_on"
            label="Vehicle inspection expiry (DD-MM-YYYY)"
            placeholder="DD-MM-YYYY"
            required
          />
          <Field
            name="capability_approved_until"
            label="Capability approval until (DD-MM-YYYY HH:mm)"
            placeholder="DD-MM-YYYY HH:mm"
            required
          />
          <Field name="vehicle_label" label="Vehicle display name" />
          <Field
            name="equipment_notes"
            label="Reviewed equipment notes"
            required
          />
          <Field name="crew_notes" label="Reviewed crew notes" required />
        </div>
      )}
      <Button disabled={pending}>
        {pending ? "Verifying…" : `Verify ${subjectType}`}
      </Button>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} placeholder={placeholder} required={required} />
    </div>
  );
}

function useReviewToast(state: {
  error: string | null;
  success: string | null;
}) {
  const router = useRouter();
  const lastState = useRef<typeof state | null>(null);
  useEffect(() => {
    if (lastState.current === state) return;
    lastState.current = state;
    if (state.error)
      toast.add({
        title: "Review failed",
        description: state.error,
        type: "error",
      });
    if (state.success) {
      toast.add({ title: state.success, type: "success" });
      router.refresh();
    }
  }, [router, state]);
}
