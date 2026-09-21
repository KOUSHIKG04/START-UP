"use client";

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
  const { formData, setFormData, isSubmitted, handleSubmit } =
    useAddDoctorForm(onSuccess);

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-xs w-full max-w-[480px]">
      {showOuterHeader && (
        <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f0] mb-5">
          <div className="flex items-center gap-2.5">
            <UserCheck className="size-5 text-[#07595d]" />
            <h2 className="text-[18px] font-bold text-[#0f172a]">
              Add new Doctor
            </h2>
          </div>
          <button
            type="button"
            onClick={onViewAll}
            className="text-[13px] font-semibold text-[#07595d] hover:underline cursor-pointer"
          >
            View All
          </button>
        </div>
      )}

      {/* Inner Panel (Figma 939:19) */}
      <div className="bg-[#fafafa] border border-[#e2e8f0] rounded-[12px] p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-[#0f172a]">
            Add New Doctor
          </h3>
          <span className="bg-[#e6f5f4] text-[#07595d] text-[11px] font-bold px-2 py-1 rounded-[6px]">
            New Doctor
          </span>
        </div>

        {isSubmitted ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-2">
            <CheckCircle2 className="size-10 text-[#07595d] animate-in zoom-in-75 duration-200" />
            <p className="text-[15px] font-bold text-[#0f172a]">
              Doctor Saved Successfully!
            </p>
            <p className="text-[12px] text-[#64748b]">
              Added to active hospital roster and schedules.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {/* Doctor Name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="add-doctor-name" className="text-[13px] font-medium text-[#5c6678]">
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
                className="bg-white border border-[#e3e8f0] rounded-[8px] h-10 px-3.5 text-[14px] text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#07595d] focus:ring-1 focus:ring-[#07595d]/30 transition-all"
              />
            </div>

            {/* Doctor ID (Clinzo) */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="add-doctor-clinzo-id" className="text-[13px] font-medium text-[#5c6678]">
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
                className="bg-white border border-[#e3e8f0] rounded-[8px] h-10 px-3.5 text-[14px] text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#07595d] focus:ring-1 focus:ring-[#07595d]/30 transition-all"
              />
            </div>

            {/* Specialization */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="add-doctor-specialization" className="text-[13px] font-medium text-[#5c6678]">
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
                className="bg-white border border-[#e3e8f0] rounded-[8px] h-10 px-3.5 text-[14px] text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#07595d] focus:ring-1 focus:ring-[#07595d]/30 transition-all"
              />
            </div>

            {/* Phone Number */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="add-doctor-phone" className="text-[13px] font-medium text-[#5c6678]">
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
                className="bg-white border border-[#e3e8f0] rounded-[8px] h-10 px-3.5 text-[14px] text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#07595d] focus:ring-1 focus:ring-[#07595d]/30 transition-all"
              />
            </div>

            {/* Save Doctor Button */}
            <Button
              type="submit"
              className="mt-2 bg-[#07595d] hover:bg-[#064e52] text-white font-semibold text-[14px] h-11 rounded-[8px] w-full cursor-pointer shadow-xs transition-colors"
            >
              Save Doctor
            </Button>
          </form>
        )}

        <p className="text-[12px] text-[#94a3b8] pt-1 border-t border-[#e2e8f0]/60">
          Required for scheduling and patient records.
        </p>
      </div>
    </div>
  );
}
