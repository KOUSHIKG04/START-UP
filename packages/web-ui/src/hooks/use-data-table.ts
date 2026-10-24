"use client";

import * as React from "react";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type PaginationState,
} from "@tanstack/react-table";
import type { DataTableProps } from "../types/dataTable";

export function useDataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  rowCount,
  pagination,
  onPaginationChange,
  manualPagination,
  sorting,
  onSortingChange,
  manualSorting,
}: Pick<
  DataTableProps<TData, TValue>,
  | "columns"
  | "data"
  | "pageCount"
  | "rowCount"
  | "pagination"
  | "onPaginationChange"
  | "manualPagination"
  | "sorting"
  | "onSortingChange"
  | "manualSorting"
>) {
  const [internalSorting, setInternalSorting] = React.useState<SortingState>(
    []
  );
  const [internalPagination, setInternalPagination] =
    React.useState<PaginationState>({
      pageIndex: 0,
      pageSize: 10,
    });

  const isSortingControlled =
    sorting !== undefined && onSortingChange !== undefined;
  const activeSorting = isSortingControlled ? sorting : internalSorting;
  const activeSetSorting = isSortingControlled
    ? onSortingChange
    : setInternalSorting;

  const isPaginationControlled =
    pagination !== undefined && onPaginationChange !== undefined;
  const activePagination = isPaginationControlled
    ? pagination
    : internalPagination;
  const activeSetPagination = isPaginationControlled
    ? onPaginationChange
    : setInternalPagination;

  const table = useReactTable({
    data,
    columns,
    pageCount,
    rowCount,
    state: {
      sorting: activeSorting,
      pagination: activePagination,
    },
    manualPagination,
    manualSorting,
    onSortingChange: activeSetSorting,
    onPaginationChange: activeSetPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: manualPagination
      ? undefined
      : getPaginationRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
  });

  return table;
}
