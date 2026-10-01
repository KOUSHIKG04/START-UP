"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BedInventoryProjection } from "@startup/contracts";
import type { DeptBedData } from "../types/bedManagement";
import { bedRowColor } from "../utils/bedManagementConstants";
import { saveBedInventory } from "../server/actions";

function rowsFromInventory(inventory: BedInventoryProjection[]): DeptBedData[] {
  return inventory.map((row, index) => ({
    ...row,
    id: row.bedTypeId,
    name: row.bedTypeName,
    dotColor: bedRowColor(index),
    barColor: bedRowColor(index),
  }));
}

export function useBedManagement(inventory: BedInventoryProjection[]) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"percent" | "count">("percent");
  const departments: DeptBedData[] = rowsFromInventory(inventory);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleAdjustAvailable = (id: string, delta: number) => {
    const row = departments.find((item) => item.id === id);
    if (!row || pendingId || !row.configured) return;
    const nextAvailable = row.available + delta;
    if (nextAvailable < 0 || nextAvailable > row.total - row.maintenance) return;
    const form = new FormData();
    form.set("facilityId", row.facilityId);
    form.set("bedTypeId", row.bedTypeId);
    form.set("total", String(row.total));
    form.set("occupied", String(row.total - row.maintenance - nextAvailable));
    form.set("maintenance", String(row.maintenance));
    form.set("expectedRowVersion", row.rowVersion ?? "0");
    setPendingId(id);
    setSaveError(null);
    startTransition(async () => {
      try {
        const result = await saveBedInventory(form);
        if (result.error) setSaveError(result.error);
        else router.refresh();
      } catch {
        setSaveError("Could not update bed availability. Try again.");
      } finally {
        setPendingId(null);
      }
    });
  };

  const totalBeds = departments.reduce((sum, row) => sum + row.total, 0);
  const totalAvailable = departments.reduce((sum, row) => sum + row.available, 0);
  const totalOccupied = departments.reduce((sum, row) => sum + row.occupied, 0);
  const totalMaintenance = departments.reduce((sum, row) => sum + row.maintenance, 0);
  const availPercent = totalBeds ? ((totalAvailable / totalBeds) * 100).toFixed(1) : "0";
  const occPercent = totalBeds ? ((totalOccupied / totalBeds) * 100).toFixed(1) : "0";

  return { viewMode, setViewMode, departments, handleAdjustAvailable, totalBeds, totalAvailable, totalOccupied, totalMaintenance, availPercent, occPercent, pendingId, saveError };
}
