"use client";

import { useDocumentReview } from "../hooks/useDocumentReview";
import type { DocumentActionsProps } from "../types/document-actions";
import { Button } from "@startup/web-ui/components/ui/button";
import { Label } from "@startup/web-ui/components/ui/label";
import { Textarea } from "@startup/web-ui/components/ui/textarea";

export function DocumentActions({
  caseId,
  documentId,
  approvalLabel = "Approve",
  canApprove = true,
}: DocumentActionsProps) {
  const { action, pending } = useDocumentReview({
    caseId,
    documentId,
    approvalLabel,
    canApprove,
  });
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
      <Button
        name="decision"
        value="approved"
        disabled={pending || !canApprove}
      >
        {approvalLabel}
      </Button>
    </form>
  );
}
