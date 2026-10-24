"use client";

import { doctorApi } from "../services/doctorApi";
import type { DoctorFilters } from "../types/doctorDirectory";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

/**
 * Doctor API client service.
 * Supports pagination, searching, filtering, and query signals.
 */

/**
 * Standard TanStack Query hook matching the integration pattern.
 */
export function useDoctors(
  userId: string,
  organizationId: string,
  filters: { page: number; search: string }
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
  const [searchTerm, setSearchTerm] = React.useState(
    initialFilters?.search || ""
  );
  const [page, setPage] = React.useState(initialFilters?.page || 1);
  const [pageSize, setPageSize] = React.useState(
    initialFilters?.pageSize || 10
  );
  const [status, setStatus] = React.useState(initialFilters?.status || "all");
  const [specialization, setSpecialization] = React.useState(
    initialFilters?.specialization || "all"
  );

  const query = useQuery({
    queryKey: [
      "doctors",
      "directory",
      { search: searchTerm, page, pageSize, status, specialization },
    ],
    queryFn: ({ signal }) =>
      doctorApi.list({
        search: searchTerm,
        page,
        pageSize,
        status,
        specialization,
        signal,
      }),
    staleTime: 30_000,
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
    summary: query.data?.summary ?? { total: 0, active: 0, verified: 0 },
    doctors: query.data?.items ?? [],
    filteredDoctors: query.data?.items ?? [], // For backward compatibility
    total: query.data?.total ?? 0,
    totalPages: query.data?.totalPages ?? 1,
    isPending: query.isPending,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
