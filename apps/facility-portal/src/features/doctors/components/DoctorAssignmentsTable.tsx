import Link from "next/link";
import * as React from "react";
import {
  Avatar,
  AvatarFallback,
} from "@startup/web-ui/components/ui/avatar";

type Assignment = { id: string; practiceId: string; name: string; department: string; shiftTime: string; status: "On Duty" | "On Call" | "In Surgery"; contact: string };

export function DoctorAssignmentsTable({ assignments }: { assignments: Assignment[] }) {
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-xs">
      <div className="pb-4 border-b border-[#e2e8f0]">
        <h2 className="text-[18px] font-bold text-[#0f172a]">
          Today&apos;s Doctor Assignments
        </h2>
        <p className="text-[13px] text-[#475569] mt-0.5">
          Current active shifts and operational status
        </p>
      </div>

      <div className="overflow-x-auto mt-2">
        <table className="w-full text-left text-[13px] border-collapse min-w-[760px]">
          <thead>
            <tr className="border-b border-[#e2e8f0] text-[#64748b] text-[11px] font-bold uppercase tracking-wider">
              <th className="py-3 px-3">Doctor Name</th>
              <th className="py-3 px-3">Department</th>
              <th className="py-3 px-3">Shift Time</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Contact</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {assignments.map((doc) => (
              <tr
                key={doc.id}
                className="hover:bg-slate-50/70 transition-colors"
              >
                {/* Doctor Name with Avatar */}
                <td className="py-3.5 px-3">
                  <div className="flex items-center gap-3 font-semibold text-[#0f172a]">
                    <Avatar className="size-8 rounded-full border border-slate-200">
                      <AvatarFallback className="bg-slate-100 text-slate-700 text-xs font-semibold">
                        {doc.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{doc.name}</span>
                  </div>
                </td>

                {/* Department */}
                <td className="py-3.5 px-3 text-[#475569] font-medium">
                  {doc.department}
                </td>

                {/* Shift Time */}
                <td className="py-3.5 px-3 text-[#0f172a] font-medium">
                  {doc.shiftTime}
                </td>

                {/* Status Badge */}
                <td className="py-3.5 px-3">
                  {doc.status === "In Surgery" && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-semibold bg-[#fee2e2] text-[#ef4444]">
                      In Surgery
                    </span>
                  )}
                  {doc.status === "On Duty" && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-semibold bg-[#ecfdf5] text-[#10b981]">
                      On Duty
                    </span>
                  )}
                  {doc.status === "On Call" && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-semibold bg-[#fffbeb] text-[#f59e0b]">
                      On Call
                    </span>
                  )}
                </td>

                {/* Contact */}
                <td className="py-3.5 px-3 text-[#475569] font-medium">
                  {doc.contact}
                </td>

                {/* Action */}
                <td className="py-3.5 px-3 text-right">
                  <Link href={`/doctor-schedules/${doc.practiceId}`} className="text-[13px] font-medium text-[#00877B] hover:underline">Manage schedule</Link>
                </td>
              </tr>
            ))}
            {assignments.length === 0 && <tr><td colSpan={6} className="px-3 py-5 text-[#64748b]">No published doctor assignments today.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
