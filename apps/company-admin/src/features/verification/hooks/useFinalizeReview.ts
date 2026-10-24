"use client";

import { useReviewToast } from "./useReviewToast";
import type { FinalizeActionProps } from "../types/finalize-action";
import { useActionState } from "react";
import { finalizeCase } from "../server/actions";

export function useFinalizeReview({
  caseId,
  subjectType,
}: FinalizeActionProps) {
  const [state, action, pending] = useActionState(
    finalizeCase.bind(null, caseId, subjectType),
    { error: null, success: null }
  );
  useReviewToast(state);

  return { action, pending };
}
