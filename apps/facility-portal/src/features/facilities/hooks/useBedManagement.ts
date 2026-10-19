"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@startup/web-ui/components/ui/toast";
import type { BedInventoryProjection } from "@startup/contracts";
import type { DeptBedData } from "../types/bedManagement";
import { bedRowColor } from "../utils/bedRowColor";
import {
  BedSaveError,
  reloadBedCounts,
  saveBedCounts,
} from "../client/bedInventory";

export function useBedManagement(inventory: BedInventoryProjection[]) {
  const facilityId = inventory[0]?.facilityId;
  const liveInventory = useQuery({
    queryKey: ["facility-live-beds", facilityId],
    queryFn: () => reloadBedCounts(facilityId!),
    initialData: inventory,
    enabled: Boolean(facilityId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const [viewMode, setViewMode] = useState<"percent" | "count">("percent");
  const [savedRows, setSavedRows] = useState<
    Record<string, BedInventoryProjection>
  >({});
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const saving = useRef(new Set<string>());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const departments = useMemo<DeptBedData[]>(
    () =>
      inventory.map((input, index) => {
        const live = liveInventory.data?.find(
          (row) =>
            row.facilityId === input.facilityId &&
            row.bedTypeId === input.bedTypeId
        );
        const original =
          live &&
          BigInt(live.rowVersion ?? "0") >= BigInt(input.rowVersion ?? "0")
            ? live
            : input;
        const saved = savedRows[original.bedTypeId];
        const row =
          saved?.facilityId === original.facilityId &&
          BigInt(saved.rowVersion ?? "0") >= BigInt(original.rowVersion ?? "0")
            ? saved
            : original;
        return {
          ...row,
          id: row.bedTypeId,
          name: row.bedTypeName,
          dotColor: bedRowColor(index),
          barColor: bedRowColor(index),
        };
      }),
    [inventory, savedRows, liveInventory.data]
  );
  const acceptSavedRow = useCallback((row: BedInventoryProjection) => {
    if (!mounted.current) return;
    setSavedRows((current) => {
      const existing = current[row.bedTypeId];
      if (
        existing?.facilityId === row.facilityId &&
        BigInt(existing.rowVersion ?? "0") > BigInt(row.rowVersion ?? "0")
      )
        return current;
      return { ...current, [row.bedTypeId]: row };
    });
  }, []);
  const handleSetCount = async (
    id: string,
    field: "available" | "occupied",
    value: number
  ) => {
    const row = departments.find((item) => item.id === id);
    if (!row || saving.current.has(id) || !row.configured) return;
    const capacity = row.total - row.maintenance;
    if (!Number.isInteger(value) || value < 0 || value > capacity) return;
    const occupied = field === "occupied" ? value : capacity - value;
    if (occupied === row.occupied) return;
    const form = new FormData();
    form.set("facilityId", row.facilityId);
    form.set("bedTypeId", row.bedTypeId);
    form.set("total", String(row.total));
    form.set("occupied", String(occupied));
    form.set("maintenance", String(row.maintenance));
    form.set("expectedRowVersion", row.rowVersion ?? "0");
    saving.current.add(id);
    setPendingIds(new Set(saving.current));
    try {
      acceptSavedRow(await saveBedCounts(form));
      if (mounted.current)
        toast.add({ title: "Bed counts updated", type: "success" });
    } catch (error) {
      if (error instanceof BedSaveError && error.code === "PT409") {
        try {
          (await reloadBedCounts(row.facilityId)).forEach(acceptSavedRow);
        } catch {
          /* Keep the last confirmed counts. */
        }
      }
      if (mounted.current)
        toast.add({
          title: "Could not update beds",
          description:
            error instanceof Error
              ? error.message
              : "Check your connection and try again.",
          type: "error",
        });
    } finally {
      saving.current.delete(id);
      if (mounted.current) setPendingIds(new Set(saving.current));
    }
  };
  const totalBeds = departments.reduce((sum, row) => sum + row.total, 0);
  const totalAvailable = departments.reduce(
    (sum, row) => sum + row.available,
    0
  );
  const totalOccupied = departments.reduce((sum, row) => sum + row.occupied, 0);
  const totalMaintenance = departments.reduce(
    (sum, row) => sum + row.maintenance,
    0
  );
  const availPercent = totalBeds
    ? ((totalAvailable / totalBeds) * 100).toFixed(1)
    : "0";
  const occPercent = totalBeds
    ? ((totalOccupied / totalBeds) * 100).toFixed(1)
    : "0";
  return {
    viewMode,
    setViewMode,
    departments,
    handleSetCount,
    acceptSavedRow,
    totalBeds,
    totalAvailable,
    totalOccupied,
    totalMaintenance,
    availPercent,
    occPercent,
    pendingIds,
  };
}
