"use client";
import { useDataTable } from "../hooks/use-data-table";
import type { DataTableProps } from "../types/dataTable";
import { flexRender } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
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

export type { DataTableProps } from "../types/dataTable";

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
  const table = useDataTable({
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
  });

  return (
    <div className={cn("w-full space-y-3", className)}>
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-2xs">
        <Table className="w-full text-sm">
          <TableHeader className="border-border bg-background border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-border hover:bg-transparent"
              >
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();

                  return (
                    <TableHead
                      key={header.id}
                      className="text-muted-foreground px-4 py-3 text-xs font-bold tracking-wider uppercase"
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="hover:text-foreground -ml-1 flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 transition-colors select-none"
                        >
                          <span>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </span>
                          {isSorted === "asc" ? (
                            <ArrowUp className="text-primary size-3" />
                          ) : isSorted === "desc" ? (
                            <ArrowDown className="text-primary size-3" />
                          ) : (
                            <ArrowUpDown className="size-3 opacity-40 hover:opacity-100" />
                          )}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody className="divide-border divide-y">
            {isLoading ? (
              Array.from({ length: loadingRowCount }).map((_, rIdx) => (
                <TableRow
                  key={`skeleton-row-${rIdx}`}
                  className="hover:bg-transparent"
                >
                  {columns.map((_, cIdx) => (
                    <TableCell
                      key={`skeleton-cell-${cIdx}`}
                      className="px-4 py-3.5"
                    >
                      <Skeleton className="bg-muted h-4 w-[75%] rounded" />
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
                    "border-border hover:bg-muted/70 transition-colors",
                    onRowClick &&
                      "focus-visible:ring-primary focus-visible:ring-primary focus-visible:ring-offset-background cursor-pointer focus-visible:ring-1 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="text-foreground px-4 py-3 align-middle"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground h-36 py-8 text-center"
                >
                  {emptyState ? (
                    emptyState
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <p className="text-muted-foreground text-sm font-medium">
                        {emptyMessage}
                      </p>
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
        <div className="text-muted-foreground flex flex-col items-center justify-between gap-3 px-1 py-1 text-xs sm:flex-row">
          <div className="flex items-center gap-2">
            {(() => {
              const totalEntries = manualPagination
                ? rowCount !== undefined
                  ? rowCount
                  : (pageCount || 1) * table.getState().pagination.pageSize
                : data.length;
              const startEntry =
                table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                (table.getRowModel().rows.length > 0 ? 1 : 0);
              const endEntry = Math.min(
                (table.getState().pagination.pageIndex + 1) *
                  table.getState().pagination.pageSize,
                totalEntries
              );

              return (
                <span>
                  Showing{" "}
                  <span className="text-foreground font-semibold">
                    {startEntry}
                  </span>{" "}
                  to{" "}
                  <span className="text-foreground font-semibold">
                    {endEntry}
                  </span>{" "}
                  of{" "}
                  <span className="text-foreground font-semibold">
                    {totalEntries}
                  </span>{" "}
                  entries
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
              className="border-border text-muted-foreground hover:bg-muted h-8 w-8 p-0 disabled:opacity-40"
              title="First page"
            >
              <ChevronsLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="border-border text-muted-foreground hover:bg-muted h-8 px-2.5 text-xs disabled:opacity-40"
            >
              <ChevronLeft className="mr-1 size-3.5" />
              Previous
            </Button>

            <span className="text-foreground px-2 font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount() || 1}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="border-border text-muted-foreground hover:bg-muted h-8 px-2.5 text-xs disabled:opacity-40"
            >
              Next
              <ChevronRight className="ml-1 size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="border-border text-muted-foreground hover:bg-muted h-8 w-8 p-0 disabled:opacity-40"
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
