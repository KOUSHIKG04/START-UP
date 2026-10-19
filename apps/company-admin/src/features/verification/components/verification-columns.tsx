"use client";
import type { ColumnDef } from "@tanstack/react-table";
import {
  formatDisplayDate,
  type VerificationQueueItem,
} from "@startup/contracts";
import { StatusBadge } from "./status-badge";
export const columns: ColumnDef<VerificationQueueItem, unknown>[] = [
  {
    accessorKey: "subject_name",
    header: "Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.subject_name}</span>
    ),
  },
  {
    accessorKey: "subject_type",
    header: "Type",
    cell: ({ row }) => (
      <span className="capitalize">
        {row.original.subject_type === "facility"
          ? "Hospital / clinic"
          : row.original.subject_type}
      </span>
    ),
  },
  {
    accessorKey: "submitted_at",
    header: "Submitted",
    cell: ({ row }) =>
      formatDisplayDate(row.original.submitted_at, "Asia/Kolkata"),
  },
  { accessorKey: "document_count", header: "Documents" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "action",
    header: "Action",
    enableSorting: false,
    cell: () => <span className="text-primary font-medium">Review</span>,
  },
];
