"use client";
import { useFacilityDoctorRequests } from "../hooks/useFacilityDoctorRequests";

import type { FacilityDoctorRequestsProps } from "../types/facilityDoctorRequests";

import { Button } from "@startup/web-ui/components/ui/button";
import { Input } from "@startup/web-ui/components/ui/input";
import { Skeleton } from "@startup/web-ui/components/ui/skeleton";

export function FacilityDoctorRequests({
  onChange,
  scope,
}: FacilityDoctorRequestsProps) {
  const { reasons, setReasons, requests, decide, pending, invited } =
    useFacilityDoctorRequests({ onChange, scope });
  return (
    <section
      id="doctor-association-requests"
      className="rounded-[16px] border border-[#e2e8f0] bg-white p-6 shadow-xs"
    >
      <h2 className="text-[18px] font-bold text-[#0f172a]">
        Doctor association requests
      </h2>
      <p className="mt-1 text-[13px] text-[#475569]">
        Accept a doctor for your hospital or clinic. They can practise here only
        after Clinzo verifies their credentials.
      </p>
      {requests.isLoading && (
        <div
          role="status"
          aria-label="Loading doctor requests"
          className="mt-4 space-y-3"
        >
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}
      {!requests.isLoading && !pending.length && !invited.length && (
        <p className="mt-4 text-sm text-[#64748b]">No pending requests.</p>
      )}
      <div className="mt-4 space-y-3">
        {pending.map((item) => (
          <div key={item.id} className="rounded-xl border border-[#e2e8f0] p-4">
            <p className="font-semibold text-[#0f172a]">
              {item.doctor_name}{" "}
              <span className="text-sm font-normal text-[#64748b]">
                {item.doctor_code}
              </span>
            </p>
            <p className="text-sm text-[#475569]">
              {item.facility_name} · Clinzo credentials:{" "}
              {item.credential_status}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                disabled={decide.isPending}
                onClick={() => decide.mutate({ id: item.id, approve: true })}
              >
                Accept
              </Button>
              <Input
                aria-label={`Rejection reason for ${item.doctor_name}`}
                placeholder="Reason to decline"
                value={reasons[item.id] ?? ""}
                onChange={(event) =>
                  setReasons({ ...reasons, [item.id]: event.target.value })
                }
                className="max-w-56"
              />
              <Button
                variant="outline"
                disabled={
                  decide.isPending || (reasons[item.id]?.trim().length ?? 0) < 5
                }
                onClick={() => decide.mutate({ id: item.id, approve: false })}
              >
                Decline
              </Button>
            </div>
          </div>
        ))}
        {invited.map((item) => (
          <p key={item.id} className="text-sm text-[#475569]">
            Invitation sent to {item.doctor_name} for {item.facility_name};
            awaiting doctor acceptance.
          </p>
        ))}
      </div>
    </section>
  );
}
