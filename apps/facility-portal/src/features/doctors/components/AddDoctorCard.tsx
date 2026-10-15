"use client";

import { useEffect } from "react";
import { toast } from "@startup/web-ui/components/ui/toast";
import { useAddDoctorForm } from "../hooks/useAddDoctorForm";
import { addDoctorPlaceholders } from "../utils/addDoctorConstants";
import { UserCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@startup/web-ui/components/ui/button";

interface AddDoctorCardProps {
  onSuccess?: () => void;
  onViewAll?: () => void;
  showOuterHeader?: boolean;
}

export function AddDoctorCard({
  onSuccess,
  onViewAll,
  showOuterHeader = true,
}: AddDoctorCardProps) {
  const {
    formData,
    setFormData,
    isSubmitted,
    handleSubmit,
    busy,
    error,
    facilities,
    facilityId,
    setFacilityId,
  } = useAddDoctorForm(onSuccess);
  useEffect(() => {
    if (error)
      toast.add({
        title: "Could not invite doctor",
        description: error,
        type: "error",
      });
  }, [error]);

  return (
    <div className="w-full max-w-[480px] rounded-[16px] border border-[#e2e8f0] bg-white p-6 shadow-xs">
      {showOuterHeader && (
        <div className="mb-5 flex items-center justify-between border-b border-[#e2e8f0] pb-4">
          <div className="flex items-center gap-2.5">
            <UserCheck className="size-5 text-[#07595d]" />
            <h2 className="text-[18px] font-bold text-[#0f172a]">
              Add new Doctor
            </h2>
          </div>
          <button
            type="button"
            onClick={onViewAll}
            className="cursor-pointer text-[13px] font-semibold text-[#07595d] hover:underline"
          >
            View All
          </button>
        </div>
      )}

      {/* Inner Panel (Figma 939:19) */}
      <div className="flex flex-col gap-4 rounded-[12px] border border-[#e2e8f0] bg-[#fafafa] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-[#0f172a]">
            Add New Doctor
          </h3>
          <span className="rounded-[6px] bg-[#e6f5f4] px-2 py-1 text-[11px] font-bold text-[#07595d]">
            New Doctor
          </span>
        </div>

        {isSubmitted ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <CheckCircle2 className="animate-in zoom-in-75 size-10 text-[#07595d] duration-200" />
            <p className="text-[15px] font-bold text-[#0f172a]">
              Invitation sent to doctor
            </p>
            <p className="text-[12px] text-[#64748b]">
              The doctor must accept. Clinzo must verify credentials before
              practice.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {facilities.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="add-doctor-facility"
                  className="text-[13px] font-medium text-[#5c6678]"
                >
                  Hospital / Clinic
                </label>
                <select
                  id="add-doctor-facility"
                  value={facilityId || facilities[0]?.facilityId}
                  onChange={(event) => setFacilityId(event.target.value)}
                  className="h-10 rounded-[8px] border border-[#e3e8f0] bg-white px-3.5 text-[14px]"
                >
                  {facilities.map((item) => (
                    <option key={item.facilityId} value={item.facilityId}>
                      {item.facilityName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {/* Doctor Name */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="add-doctor-name"
                className="text-[13px] font-medium text-[#5c6678]"
              >
                Doctor Name
              </label>
              <input
                id="add-doctor-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder={addDoctorPlaceholders.name}
                className="h-10 rounded-[8px] border border-[#e3e8f0] bg-white px-3.5 text-[14px] text-[#0f172a] placeholder-[#94a3b8] transition-colors outline-none focus:border-[#07595d] focus:ring-1 focus:ring-[#07595d]/30"
              />
            </div>

            {/* Doctor ID (Clinzo) */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="add-doctor-clinzo-id"
                className="text-[13px] font-medium text-[#5c6678]"
              >
                Doctor ID (Clinzo) Optional
              </label>
              <input
                id="add-doctor-clinzo-id"
                type="text"
                value={formData.clinzoId}
                onChange={(e) =>
                  setFormData({ ...formData, clinzoId: e.target.value })
                }
                placeholder={addDoctorPlaceholders.clinzoId}
                className="h-10 rounded-[8px] border border-[#e3e8f0] bg-white px-3.5 text-[14px] text-[#0f172a] placeholder-[#94a3b8] transition-colors outline-none focus:border-[#07595d] focus:ring-1 focus:ring-[#07595d]/30"
              />
            </div>

            {/* Specialization */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="add-doctor-specialization"
                className="text-[13px] font-medium text-[#5c6678]"
              >
                Specialization
              </label>
              <input
                id="add-doctor-specialization"
                type="text"
                value={formData.specialization}
                onChange={(e) =>
                  setFormData({ ...formData, specialization: e.target.value })
                }
                placeholder={addDoctorPlaceholders.specialization}
                className="h-10 rounded-[8px] border border-[#e3e8f0] bg-white px-3.5 text-[14px] text-[#0f172a] placeholder-[#94a3b8] transition-colors outline-none focus:border-[#07595d] focus:ring-1 focus:ring-[#07595d]/30"
              />
            </div>

            {/* Phone Number */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="add-doctor-phone"
                className="text-[13px] font-medium text-[#5c6678]"
              >
                Phone Number
              </label>
              <input
                id="add-doctor-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder={addDoctorPlaceholders.phone}
                className="h-10 rounded-[8px] border border-[#e3e8f0] bg-white px-3.5 text-[14px] text-[#0f172a] placeholder-[#94a3b8] transition-colors outline-none focus:border-[#07595d] focus:ring-1 focus:ring-[#07595d]/30"
              />
            </div>

            {/* Save Doctor Button */}
            <Button
              type="submit"
              disabled={busy || !facilities.length}
              className="mt-2 h-11 w-full cursor-pointer rounded-[8px] bg-[#07595d] text-[14px] font-semibold text-white shadow-xs transition-colors hover:bg-[#064e52]"
            >
              {busy ? "Sending…" : "Save Doctor"}
            </Button>
          </form>
        )}

        <p className="border-t border-[#e2e8f0]/60 pt-1 text-[12px] text-[#94a3b8]">
          Required for scheduling and patient records.
        </p>
      </div>
    </div>
  );
}
