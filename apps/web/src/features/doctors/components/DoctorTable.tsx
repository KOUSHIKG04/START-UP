"use client";

import * as React from "react";
import { DataTable } from "@startup/web-ui/components/data-table";
import { doctorColumns } from "./doctorColumns";
import type { DoctorRecord } from "../types/doctorManagement";
import type { PaginationState, SortingState, OnChangeFn } from "@tanstack/react-table";

export interface DoctorTableProps {
  data: DoctorRecord[];
  isLoading?: boolean;
  pageCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  manualPagination?: boolean;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  emptyMessage?: string;
  onRowClick?: (doctor: DoctorRecord) => void;
}

export function DoctorTable({
  data,
  isLoading = false,
  pageCount,
  pagination,
  onPaginationChange,
  manualPagination = false,
  sorting,
  onSortingChange,
  emptyMessage = "No doctors found matching your criteria.",
  onRowClick,
}: DoctorTableProps) {
  return (
    <DataTable
      columns={doctorColumns}
      data={data}
      isLoading={isLoading}
      pageCount={pageCount}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      manualPagination={manualPagination}
      sorting={sorting}
      onSortingChange={onSortingChange}
      emptyMessage={emptyMessage}
      onRowClick={onRowClick}
    />
  );
}
