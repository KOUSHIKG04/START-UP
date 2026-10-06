"use client";

import { useEffect } from "react";
import { toast } from "@startup/web-ui/components/ui/toast";

export function DashboardErrorToast({ message }: { message?: string }) {
  useEffect(() => {
    if (message) toast.add({ title: "Could not load dashboard", description: message, type: "error" });
  }, [message]);
  return null;
}
