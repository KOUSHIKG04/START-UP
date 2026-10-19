import type { DoctorRecord } from "./doctorManagement";
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
  summary: { total: number; active: number; verified: number };
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
