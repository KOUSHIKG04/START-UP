import Link from "next/link";
import * as React from "react";
import { Avatar, AvatarFallback } from "@startup/web-ui/components/ui/avatar";

type Assignment = {
  id: string;
  practiceId: string;
  name: string;
  department: string;
  shiftTime: string;
  status: "On Duty" | "On Call" | "Home Visit" | "In Surgery";
  contact: string;
};

export function DoctorAssignmentsTable({
  assignments,
  selectedDay,
}: {
  assignments: Assignment[];
  selectedDay: string;
}) {
  return (
    <div className="rounded-[16px] border border-[#e2e8f0] bg-white p-6 shadow-xs">
      <div className="border-b border-[#e2e8f0] pb-4">
        <h2 className="text-[18px] font-bold text-[#0f172a]">
          Doctor Assignments · {selectedDay}
        </h2>
        <p className="mt-0.5 text-[13px] text-[#475569]">
          Published shifts and operational status for the selected date
        </p>
      </div>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-[#e2e8f0] text-[11px] font-bold tracking-wider text-[#64748b] uppercase">
              <th className="px-3 py-3">Doctor Name</th>
              <th className="px-3 py-3">Department</th>
              <th className="px-3 py-3">Shift Time</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Contact</th>
              <th className="px-3 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {assignments.map((doc) => (
              <tr
                key={doc.id}
                className="transition-colors hover:bg-slate-50/70"
              >
                {/* Doctor Name with Avatar */}
                <td className="px-3 py-3.5">
                  <div className="flex items-center gap-3 font-semibold text-[#0f172a]">
                    <Avatar className="size-8 rounded-full border border-slate-200">
                      <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-700">
                        {doc.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{doc.name}</span>
                  </div>
                </td>

                {/* Department */}
                <td className="px-3 py-3.5 font-medium text-[#475569]">
                  {doc.department}
                </td>

                {/* Shift Time */}
                <td className="px-3 py-3.5 font-medium text-[#0f172a]">
                  {doc.shiftTime}
                </td>

                {/* Status Badge */}
                <td className="px-3 py-3.5">
                  {doc.status === "In Surgery" && (
                    <span className="inline-flex items-center rounded-md bg-[#fee2e2] px-2.5 py-1 text-[12px] font-semibold text-[#ef4444]">
                      In Surgery
                    </span>
                  )}
                  {doc.status === "On Duty" && (
                    <span className="inline-flex items-center rounded-md bg-[#ecfdf5] px-2.5 py-1 text-[12px] font-semibold text-[#10b981]">
                      On Duty
                    </span>
                  )}
                  {doc.status === "On Call" && (
                    <span className="inline-flex items-center rounded-md bg-[#fffbeb] px-2.5 py-1 text-[12px] font-semibold text-[#f59e0b]">
                      On Call
                    </span>
                  )}
                  {doc.status === "Home Visit" && (
                    <span className="inline-flex items-center rounded-md bg-[#ede9fe] px-2.5 py-1 text-[12px] font-semibold text-[#5b21b6]">
                      Home Visit
                    </span>
                  )}
                </td>

                {/* Contact */}
                <td className="px-3 py-3.5 font-medium text-[#475569]">
                  {doc.contact}
                </td>

                {/* Action */}
                <td className="px-3 py-3.5 text-right">
                  <Link
                    href={`/doctor-schedules/${doc.practiceId}`}
                    className="text-[13px] font-medium text-[#00877B] hover:underline"
                  >
                    Manage schedule
                  </Link>
                </td>
              </tr>
            ))}
            {assignments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-5 text-[#64748b]">
                  No published doctor assignments for {selectedDay}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
