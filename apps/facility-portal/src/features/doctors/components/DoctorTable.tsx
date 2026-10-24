"use client";

import type { DoctorTableProps } from "../types/doctorTable";

import { DataTable } from "@startup/web-ui/components/data-table";
import { doctorColumns } from "./doctorColumns";

export function DoctorTable({
  data,
  isLoading = false,
  pageCount,
  rowCount,
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
      rowCount={rowCount}
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
