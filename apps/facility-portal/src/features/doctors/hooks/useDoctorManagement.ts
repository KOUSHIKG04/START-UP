"use client";
import { useEffect } from "react";
import { toast } from "@startup/web-ui/components/ui/toast";
import { useDoctorDirectory } from "./useDoctorDirectory";
export function useDoctorManagement() {
  const {
    searchTerm,
    setSearchTerm,
    filteredDoctors,
    isLoading,
    total,
    refetch,
    isError,
    error,
    summary: doctorManagementSummary,
  } = useDoctorDirectory();
  useEffect(() => {
    if (isError)
      toast.add({
        title: "Could not load doctors",
        description:
          error instanceof Error
            ? error.message
            : "Doctor directory is unavailable.",
        type: "error",
      });
  }, [isError, error]);

  return {
    searchTerm,
    setSearchTerm,
    filteredDoctors,
    isLoading,
    total,
    refetch,
    doctorManagementSummary,
  };
}
