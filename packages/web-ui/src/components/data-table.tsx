"use client";

import * as React from "react";
import {
  type ColumnDef,
  type SortingState,
  type PaginationState,
  type OnChangeFn,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

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

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  loadingRowCount = 5,
  emptyState,
  emptyMessage = "No results found.",
  className,
  pageCount,
  rowCount,
  pagination,
  onPaginationChange,
  manualPagination = false,
  sorting,
  onSortingChange,
  manualSorting = false,
  onRowClick,
  hidePagination = false,
}: DataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
  const [internalPagination, setInternalPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const isSortingControlled = sorting !== undefined && onSortingChange !== undefined;
  const activeSorting = isSortingControlled ? sorting : internalSorting;
  const activeSetSorting = isSortingControlled ? onSortingChange : setInternalSorting;

  const isPaginationControlled = pagination !== undefined && onPaginationChange !== undefined;
  const activePagination = isPaginationControlled ? pagination : internalPagination;
  const activeSetPagination = isPaginationControlled ? onPaginationChange : setInternalPagination;

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
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
  });

  return (
    <div className={cn("w-full space-y-3", className)}>
      <div className="rounded-xl border border-[#e2e8f0] bg-white overflow-hidden shadow-2xs">
        <Table className="w-full text-[13px]">
          <TableHeader className="bg-[#f8fafc] border-b border-[#e2e8f0]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-[#e2e8f0]">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();

                  return (
                    <TableHead
                      key={header.id}
                      className="text-[#64748b] text-[11px] font-bold uppercase tracking-wider py-3 px-4"
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1.5 hover:text-[#0f172a] transition-colors -ml-1 px-1 py-0.5 rounded cursor-pointer select-none"
                        >
                          <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                          {isSorted === "asc" ? (
                            <ArrowUp className="size-3 text-[#07595d]" />
                          ) : isSorted === "desc" ? (
                            <ArrowDown className="size-3 text-[#07595d]" />
                          ) : (
                            <ArrowUpDown className="size-3 opacity-40 hover:opacity-100" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody className="divide-y divide-[#e2e8f0]">
            {isLoading ? (
              Array.from({ length: loadingRowCount }).map((_, rIdx) => (
                <TableRow key={`skeleton-row-${rIdx}`} className="hover:bg-transparent">
                  {columns.map((_, cIdx) => (
                    <TableCell key={`skeleton-cell-${cIdx}`} className="py-3.5 px-4">
                      <Skeleton className="h-4 w-[75%] rounded bg-slate-100" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? "button" : undefined}
                  onClick={() => onRowClick?.(row.original)}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row.original);
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    "hover:bg-slate-50/70 transition-colors border-[#e2e8f0]",
                    onRowClick && "cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#07595d]",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3 px-4 text-[#0f172a] align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-36 text-center text-[#64748b] py-8"
                >
                  {emptyState ? (
                    emptyState
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <p className="text-[13px] font-medium text-[#475569]">{emptyMessage}</p>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {!hidePagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-1 text-[12px] text-[#64748b]">
          <div className="flex items-center gap-2">
            {(() => {
              const totalEntries = manualPagination
                ? (rowCount !== undefined
                    ? rowCount
                    : (pageCount || 1) * table.getState().pagination.pageSize)
                : data.length;
              const startEntry =
                table.getState().pagination.pageIndex * table.getState().pagination.pageSize +
                (table.getRowModel().rows.length > 0 ? 1 : 0);
              const endEntry = Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                totalEntries,
              );

              return (
                <span>
                  Showing <span className="font-semibold text-[#0f172a]">{startEntry}</span> to{" "}
                  <span className="font-semibold text-[#0f172a]">{endEntry}</span> of{" "}
                  <span className="font-semibold text-[#0f172a]">{totalEntries}</span> entries
                </span>
              );
            })()}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8 p-0 border-[#e2e8f0] text-[#475569] hover:bg-slate-50 disabled:opacity-40"
              title="First page"
            >
              <ChevronsLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 px-2.5 text-[12px] border-[#e2e8f0] text-[#475569] hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5 mr-1" />
              Previous
            </Button>

            <span className="px-2 font-medium text-[#0f172a]">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount() || 1}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 px-2.5 text-[12px] border-[#e2e8f0] text-[#475569] hover:bg-slate-50 disabled:opacity-40"
            >
              Next
              <ChevronRight className="size-3.5 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8 p-0 border-[#e2e8f0] text-[#475569] hover:bg-slate-50 disabled:opacity-40"
              title="Last page"
            >
              <ChevronsRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
