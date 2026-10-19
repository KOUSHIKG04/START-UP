"use client";
import { Field } from "./review-field";

import { useFinalizeReview } from "../hooks/useFinalizeReview";
import type { FinalizeActionProps } from "../types/finalize-action";
import { Button } from "@startup/web-ui/components/ui/button";
export function FinalizeAction({ caseId, subjectType }: FinalizeActionProps) {
  const { action, pending } = useFinalizeReview({ caseId, subjectType });
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
