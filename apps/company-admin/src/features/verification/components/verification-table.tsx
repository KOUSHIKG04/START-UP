"use client";
import { useRouter } from "next/navigation";

import { columns } from "./verification-columns";
import type { VerificationTableProps } from "../types/verification-table";

import { DataTable } from "@startup/web-ui/components/data-table";

export function VerificationTable({ cases }: VerificationTableProps) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns}
      data={cases}
      emptyMessage="No matching submissions. Change the filters or wait for a new submission."
      onRowClick={(item) => router.push(`/verification/${item.id}`)}
    />
  );
}
