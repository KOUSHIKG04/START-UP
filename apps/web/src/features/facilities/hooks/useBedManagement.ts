"use client";

import * as React from "react";
import type { DeptBedData } from "../types/bedManagement";
import { initialDepts } from "../utils/bedManagementConstants";

export function useBedManagement() {
  const [viewMode, setViewMode] = React.useState<"percent" | "count">(
    "percent",
  );
  const [departments, setDepartments] =
    React.useState<DeptBedData[]>(initialDepts);

  const handleAdjustAvailable = (id: string, delta: number) => {
    setDepartments((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const newAvail = Math.max(0, Math.min(d.total, d.available + delta));
        const newOccupied = Math.max(0, d.total - newAvail);
        return {
          ...d,
          available: newAvail,
          occupied: newOccupied,
        };
      }),
    );
  };

  const totalBeds = departments.reduce((acc, d) => acc + d.total, 0);
  const totalAvailable = departments.reduce((acc, d) => acc + d.available, 0);
  const totalOccupied = departments.reduce((acc, d) => acc + d.occupied, 0);
  const availPercent =
    totalBeds > 0 ? ((totalAvailable / totalBeds) * 100).toFixed(1) : "0";
  const occPercent =
    totalBeds > 0 ? ((totalOccupied / totalBeds) * 100).toFixed(1) : "0";

  return {
    viewMode,
    setViewMode,
    departments,
    handleAdjustAvailable,
    totalBeds,
    totalAvailable,
    totalOccupied,
    availPercent,
    occPercent,
  };
}
