"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { MoreVertical, Phone, Stethoscope, Eye, Edit } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@startup/web-ui/components/ui/avatar";
import { Button } from "@startup/web-ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@startup/web-ui/components/ui/dropdown-menu";
import type { DoctorRecord } from "../types/doctorManagement";

export const doctorColumns: ColumnDef<DoctorRecord>[] = [
  {
    accessorKey: "name",
    header: "Doctor",
    cell: ({ row }) => {
      const doctor = row.original;
      return (
        <div className="flex items-center gap-2.5">
          <Avatar className="size-8 rounded-full border border-slate-200 shrink-0">
            <AvatarImage src={doctor.avatar} alt={doctor.name} />
            <AvatarFallback className="bg-[#e6f4f5] text-[#07595d] text-xs font-semibold">
              {doctor.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-[#0f172a] truncate leading-tight">
              {doctor.name}
            </p>
            <p className="text-[11px] text-[#94a3b8] flex items-center gap-1 mt-0.5 truncate">
              <Phone className="size-2.5 shrink-0" />
              {doctor.phone}
            </p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "specialization",
    header: "Specialization",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 font-medium text-[#0f172a]">
        <Stethoscope className="size-3.5 text-[#07595d]/60 shrink-0" />
        <span>{row.original.specialization}</span>
      </div>
    ),
  },
  {
    accessorKey: "clinzoId",
    header: "Clinzo ID",
    cell: ({ row }) => (
      <span className="font-mono text-[12px] font-semibold text-[#07595d] bg-[#e6f4f5] px-2 py-0.5 rounded">
        {row.original.clinzoId}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const badgeStyle =
        status === "Active"
          ? "bg-[#ecfdf5] text-[#10b981] border-[#a7f3d0]"
          : status === "On Call"
            ? "bg-[#eff6ff] text-[#3b82f6] border-[#bfdbfe]"
            : "bg-[#fffbeb] text-[#b45309] border-[#fde68a]";

      const dotColor =
        status === "Active"
          ? "bg-[#10b981]"
          : status === "On Call"
            ? "bg-[#3b82f6]"
            : "bg-[#f59e0b]";

      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeStyle}`}
        >
          <span className={`size-1.5 rounded-full ${dotColor}`} />
          {status}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const doctor = row.original;
      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0 text-[#94a3b8] hover:text-[#0f172a] hover:bg-slate-100 rounded-lg"
              >
                <MoreVertical className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 text-[13px]">
              <DropdownMenuLabel className="text-[11px] font-bold text-[#64748b] uppercase">
                {doctor.name}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
                <Eye className="size-3.5 text-[#64748b]" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
                <Edit className="size-3.5 text-[#64748b]" />
                Edit Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer">
                Deactivate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
