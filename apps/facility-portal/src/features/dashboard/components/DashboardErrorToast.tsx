"use client";
import type { DashboardErrorToastProps } from "../types/dashboardErrorToast";

import { useEffect } from "react";
import { toast } from "@startup/web-ui/components/ui/toast";

export function DashboardErrorToast({ message }: DashboardErrorToastProps) {
  useEffect(() => {
    if (message)
      toast.add({
        title: "Could not load dashboard",
        description: message,
        type: "error",
      });
  }, [message]);
  return null;
}
