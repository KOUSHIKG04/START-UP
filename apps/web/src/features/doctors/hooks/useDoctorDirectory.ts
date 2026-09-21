"use client";

import * as React from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { initialDoctors } from "../utils/doctorManagementConstants";
import type { DoctorRecord } from "../types/doctorManagement";

export interface DoctorFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  specialization?: string;
  organizationId?: string;
}

export interface DoctorListResponse {
  items: DoctorRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Doctor API client service.
 * Supports pagination, searching, filtering, and query signals.
 */
export const doctorApi = {
  list: async ({
    organizationId,
    search = "",
    page = 1,
    pageSize = 10,
    status,
    specialization,
    signal,
  }: DoctorFilters & { signal?: AbortSignal } = {}): Promise<DoctorListResponse> => {
    // Check if request was aborted
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    // In a production setup, this would fetch from `/api/doctors`
    let result = [...initialDoctors];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.specialization.toLowerCase().includes(q) ||
          d.clinzoId.toLowerCase().includes(q) ||
          d.phone.toLowerCase().includes(q),
      );
    }

    if (status && status !== "all") {
      result = result.filter((d) => d.status.toLowerCase() === status.toLowerCase());
    }

    if (specialization && specialization !== "all") {
      result = result.filter(
        (d) => d.specialization.toLowerCase() === specialization.toLowerCase(),
      );
    }

    const total = result.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = result.slice(startIndex, startIndex + pageSize);

    return {
      items: paginatedItems,
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  create: async (newDoctor: Omit<DoctorRecord, "id">): Promise<DoctorRecord> => {
    const created: DoctorRecord = {
      ...newDoctor,
      id: String(Date.now()),
    };
    initialDoctors.unshift(created);
    return created;
  },
};

/**
 * Standard TanStack Query hook matching the integration pattern.
 */
export function useDoctors(
  userId: string,
  organizationId: string,
  filters: { page: number; search: string },
) {
  return useQuery({
    queryKey: ["doctors", userId, organizationId, filters],
    queryFn: ({ signal }) =>
      doctorApi.list({ organizationId, ...filters, signal }),
    enabled: Boolean(userId && organizationId),
  });
}

/**
 * Primary hook for the Doctor Directory table screen.
 * Handles search state, pagination, and TanStack Query synchronization.
 */
export function useDoctorDirectory(initialFilters?: Partial<DoctorFilters>) {
  const [searchTerm, setSearchTerm] = React.useState(initialFilters?.search || "");
  const [page, setPage] = React.useState(initialFilters?.page || 1);
  const [pageSize, setPageSize] = React.useState(initialFilters?.pageSize || 10);
  const [status, setStatus] = React.useState(initialFilters?.status || "all");
  const [specialization, setSpecialization] = React.useState(initialFilters?.specialization || "all");

  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["doctors", "directory", { search: searchTerm, page, pageSize, status, specialization }],
    queryFn: ({ signal }) =>
      doctorApi.list({ search: searchTerm, page, pageSize, status, specialization, signal }),
    staleTime: 30_000,
  });

  const createDoctorMutation = useMutation({
    mutationFn: doctorApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
    },
  });

  return {
    searchTerm,
    setSearchTerm: (term: string) => {
      setSearchTerm(term);
      setPage(1); // Reset to page 1 on search change
    },
    page,
    setPage,
    pageSize,
    setPageSize,
    status,
    setStatus: (s: string) => {
      setStatus(s);
      setPage(1);
    },
    specialization,
    setSpecialization: (spec: string) => {
      setSpecialization(spec);
      setPage(1);
    },
    data: query.data,
    doctors: query.data?.items ?? [],
    filteredDoctors: query.data?.items ?? [], // For backward compatibility
    total: query.data?.total ?? 0,
    totalPages: query.data?.totalPages ?? 1,
    isPending: query.isPending,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createDoctor: createDoctorMutation.mutateAsync,
  };
}
