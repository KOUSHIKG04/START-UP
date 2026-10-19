import type * as React from "react";
import type {
  ColumnDef,
  SortingState,
  PaginationState,
  OnChangeFn,
} from "@tanstack/react-table";

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  loadingRowCount?: number;
  emptyState?: React.ReactNode;
  emptyMessage?: string;
  className?: string;
  // Controlled pagination
  pageCount?: number;
  rowCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  manualPagination?: boolean;
  // Controlled sorting
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  manualSorting?: boolean;
  // Row click
  onRowClick?: (row: TData) => void;
  // Header / Footer slot
  hidePagination?: boolean;
}
