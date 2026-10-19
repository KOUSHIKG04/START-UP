"use client";
import type {
  DoctorFilters,
  DoctorListResponse,
} from "../types/doctorDirectory";
import { facilityDoctorRosterItemSchema } from "@startup/contracts";
import type { DoctorRecord } from "../types/doctorManagement";
export const doctorApi = {
  list: async ({
    search = "",
    page = 1,
    pageSize = 10,
    status,
    specialization,
    signal,
  }: DoctorFilters & {
    signal?: AbortSignal;
  } = {}): Promise<DoctorListResponse> => {
    // Check if request was aborted
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const response = await fetch("/api/doctors", { signal, cache: "no-store" });
    if (!response.ok)
      throw new Error("Could not load the facility doctor directory.");
    let result: DoctorRecord[] = facilityDoctorRosterItemSchema
      .array()
      .parse(await response.json())
      .map((row) => ({
        id: row.id,
        name: row.name,
        specialization: row.specialization,
        clinzoId: row.clinzo_id,
        phone: row.phone,
        status: row.on_leave ? "On Leave" : "Active",
        avatar: "",
        verified: row.verified,
        present: row.present,
      }));

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.specialization.toLowerCase().includes(q) ||
          d.clinzoId.toLowerCase().includes(q) ||
          d.phone.toLowerCase().includes(q)
      );
    }

    if (status && status !== "all") {
      result = result.filter(
        (d) => d.status.toLowerCase() === status.toLowerCase()
      );
    }

    if (specialization && specialization !== "all") {
      result = result.filter(
        (d) => d.specialization.toLowerCase() === specialization.toLowerCase()
      );
    }

    const total = result.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = result.slice(startIndex, startIndex + pageSize);

    return {
      items: paginatedItems,
      summary: {
        total: result.length,
        active: result.filter(
          (doctor) => doctor.present && doctor.status === "Active"
        ).length,
        verified: result.filter((doctor) => doctor.verified).length,
      },
      total,
      page,
      pageSize,
      totalPages,
    };
  },
};
