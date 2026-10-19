"use client";
import type { AddDoctorCardProps } from "../types/addDoctorCard";

import { useEffect } from "react";
import { toast } from "@startup/web-ui/components/ui/toast";
import { useAddDoctorForm } from "../hooks/useAddDoctorForm";
import { addDoctorPlaceholders } from "../utils/addDoctorConstants";
import { UserCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@startup/web-ui/components/ui/button";

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
    <div className="border-border bg-card w-full max-w-120 rounded-lg border p-6 shadow-xs">
      {showOuterHeader && (
        <div className="border-border mb-5 flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2.5">
            <UserCheck className="text-primary size-5" />
            <h2 className="text-foreground text-lg font-bold">
              Add new Doctor
            </h2>
          </div>
          <button
            type="button"
            onClick={onViewAll}
            className="text-primary cursor-pointer text-sm font-semibold hover:underline"
          >
            View All
          </button>
        </div>
      )}

      {/* Inner Panel (Figma 939:19) */}
      <div className="border-border bg-muted flex flex-col gap-4 rounded-lg border p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-foreground text-sm font-bold">Add New Doctor</h3>
          <span className="bg-muted text-primary rounded-md px-2 py-1 text-xs font-bold">
            New Doctor
          </span>
        </div>

        {isSubmitted ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <CheckCircle2 className="animate-in zoom-in-75 text-primary size-10 duration-200" />
            <p className="text-foreground text-sm font-bold">
              Invitation sent to doctor
            </p>
            <p className="text-muted-foreground text-xs">
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
                  className="text-muted-foreground text-sm font-medium"
                >
                  Hospital / Clinic
                </label>
                <select
                  id="add-doctor-facility"
                  value={facilityId || facilities[0]?.facilityId}
                  onChange={(event) => setFacilityId(event.target.value)}
                  className="border-border bg-card h-10 rounded-md border px-3.5 text-sm"
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
                className="text-muted-foreground text-sm font-medium"
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
                className="border-border bg-card text-foreground placeholder-muted-foreground focus-visible:ring-primary focus-visible:ring-offset-background focus:border-primary focus:ring-primary/30 h-10 rounded-md border px-3.5 text-sm transition-colors outline-none focus:ring-1 focus-visible:ring-2 focus-visible:ring-offset-2"
              />
            </div>

            {/* Doctor ID (Clinzo) */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="add-doctor-clinzo-id"
                className="text-muted-foreground text-sm font-medium"
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
                className="border-border bg-card text-foreground placeholder-muted-foreground focus-visible:ring-primary focus-visible:ring-offset-background focus:border-primary focus:ring-primary/30 h-10 rounded-md border px-3.5 text-sm transition-colors outline-none focus:ring-1 focus-visible:ring-2 focus-visible:ring-offset-2"
              />
            </div>

            {/* Specialization */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="add-doctor-specialization"
                className="text-muted-foreground text-sm font-medium"
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
                className="border-border bg-card text-foreground placeholder-muted-foreground focus-visible:ring-primary focus-visible:ring-offset-background focus:border-primary focus:ring-primary/30 h-10 rounded-md border px-3.5 text-sm transition-colors outline-none focus:ring-1 focus-visible:ring-2 focus-visible:ring-offset-2"
              />
            </div>

            {/* Phone Number */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="add-doctor-phone"
                className="text-muted-foreground text-sm font-medium"
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
                className="border-border bg-card text-foreground placeholder-muted-foreground focus-visible:ring-primary focus-visible:ring-offset-background focus:border-primary focus:ring-primary/30 h-10 rounded-md border px-3.5 text-sm transition-colors outline-none focus:ring-1 focus-visible:ring-2 focus-visible:ring-offset-2"
              />
            </div>

            {/* Save Doctor Button */}
            <Button
              type="submit"
              disabled={busy || !facilities.length}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 h-11 w-full cursor-pointer rounded-md text-sm font-semibold shadow-xs transition-colors"
            >
              {busy ? "Sending…" : "Save Doctor"}
            </Button>
          </form>
        )}

        <p className="border-border/60 text-muted-foreground border-t pt-1 text-xs">
          Required for scheduling and patient records.
        </p>
      </div>
    </div>
  );
}
