import type { DoctorAssignmentsTableProps } from "../types/doctorAssignmentsTable";

import Link from "next/link";

import { Avatar, AvatarFallback } from "@startup/web-ui/components/ui/avatar";

export function DoctorAssignmentsTable({
  assignments,
  selectedDay,
}: DoctorAssignmentsTableProps) {
  return (
    <div className="border-border bg-card rounded-lg border p-6 shadow-xs">
      <div className="border-border border-b pb-4">
        <h2 className="text-foreground text-lg font-bold">
          Doctor Assignments · {selectedDay}
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Published shifts and operational status for the selected date
        </p>
      </div>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-border text-muted-foreground border-b text-xs font-bold tracking-wider uppercase">
              <th className="px-3 py-3">Doctor Name</th>
              <th className="px-3 py-3">Department</th>
              <th className="px-3 py-3">Shift Time</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Contact</th>
              <th className="px-3 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {assignments.map((doc) => (
              <tr key={doc.id} className="hover:bg-muted/70 transition-colors">
                {/* Doctor Name with Avatar */}
                <td className="px-3 py-3.5">
                  <div className="text-foreground flex items-center gap-3 font-semibold">
                    <Avatar className="border-border size-8 rounded-full border">
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                        {doc.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{doc.name}</span>
                  </div>
                </td>

                {/* Department */}
                <td className="text-muted-foreground px-3 py-3.5 font-medium">
                  {doc.department}
                </td>

                {/* Shift Time */}
                <td className="text-foreground px-3 py-3.5 font-medium">
                  {doc.shiftTime}
                </td>

                {/* Status Badge */}
                <td className="px-3 py-3.5">
                  {doc.status === "In Surgery" && (
                    <span className="bg-destructive/10 text-destructive inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold">
                      In Surgery
                    </span>
                  )}
                  {doc.status === "On Duty" && (
                    <span className="bg-muted text-primary inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold">
                      On Duty
                    </span>
                  )}
                  {doc.status === "On Call" && (
                    <span className="bg-muted text-muted-foreground inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold">
                      On Call
                    </span>
                  )}
                  {doc.status === "Home Visit" && (
                    <span className="bg-muted text-primary inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold">
                      Home Visit
                    </span>
                  )}
                </td>

                {/* Contact */}
                <td className="text-muted-foreground px-3 py-3.5 font-medium">
                  {doc.contact}
                </td>

                {/* Action */}
                <td className="px-3 py-3.5 text-right">
                  <Link
                    href={`/doctor-schedules/${doc.practiceId}`}
                    className="text-primary text-sm font-medium hover:underline"
                  >
                    Manage schedule
                  </Link>
                </td>
              </tr>
            ))}
            {assignments.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted-foreground px-3 py-5">
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
