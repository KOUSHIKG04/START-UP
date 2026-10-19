"use client";
import type { BedManagementScreenProps } from "../types/bedManagementScreen";
import { useEffect } from "react";
import { toast } from "@startup/web-ui/components/ui/toast";
import { useBedManagement } from "./useBedManagement";
import { bedManagementDateFormatter } from "../utils/bedManagementDate";
export function useBedManagementScreen({
  inventory,
  loadError,
}: BedManagementScreenProps) {
  const {
    viewMode,
    setViewMode,
    departments,
    handleSetCount,
    acceptSavedRow,
    totalBeds,
    totalAvailable,
    totalOccupied,
    availPercent,
    occPercent,
    totalMaintenance,
    pendingIds,
  } = useBedManagement(inventory);
  useEffect(() => {
    if (loadError)
      toast.add({
        title: "Could not load bed inventory",
        description: loadError,
        type: "error",
      });
  }, [loadError]);
  const bedManagementDateLabel = bedManagementDateFormatter.format(new Date());

  return {
    viewMode,
    setViewMode,
    departments,
    handleSetCount,
    acceptSavedRow,
    totalBeds,
    totalAvailable,
    totalOccupied,
    availPercent,
    occPercent,
    totalMaintenance,
    pendingIds,
    bedManagementDateLabel,
  };
}
