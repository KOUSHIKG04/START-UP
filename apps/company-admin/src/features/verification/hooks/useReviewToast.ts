"use client";
import type { ReviewState } from "../types/actions";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@startup/web-ui/components/ui/toast";
export function useReviewToast(state: ReviewState) {
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
