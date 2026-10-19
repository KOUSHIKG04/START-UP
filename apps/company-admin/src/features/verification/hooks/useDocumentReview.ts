"use client";
import { useReviewToast } from "./useReviewToast";
import type { DocumentActionsProps } from "../types/document-actions";
import { useActionState } from "react";
import { reviewDocument } from "../server/actions";
export function useDocumentReview({
  caseId,
  documentId,
}: DocumentActionsProps) {
  const [state, action, pending] = useActionState(
    reviewDocument.bind(null, caseId, documentId),
    { error: null, success: null }
  );

  useReviewToast(state);

  return { action, pending };
}
