import type { DoctorRecord } from "./doctorManagement";
import type {
  PaginationState,
  SortingState,
  OnChangeFn,
} from "@tanstack/react-table";

export interface DoctorTableProps {
  data: DoctorRecord[];
  isLoading?: boolean;
  pageCount?: number;
  rowCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  manualPagination?: boolean;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  emptyMessage?: string;
  onRowClick?: (doctor: DoctorRecord) => void;
}
