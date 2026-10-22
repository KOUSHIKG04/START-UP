export interface AppointmentsPaginationData {
  range: string;
  total: number;
  currentPage: number;
  nextPages: number[];
  lastPage: number;
}

import type { ClinicAppointment } from "@startup/contracts";
import type { AppointmentPeriod } from "./appointments";
export type AppointmentsTableProps = {
  now: number;
  pageRows: ClinicAppointment[];
  pending: boolean;
  onAct: (
    item: ClinicAppointment,
    action:
      | "approve"
      | "reject"
      | "check_in"
      | "call"
      | "hold"
      | "resume"
      | "no_show"
      | "cancel"
  ) => void;
  pagination: AppointmentsPaginationData;
  onPageChange: (page: number) => void;
  displayedCount: number;
  filterPeriod: AppointmentPeriod;
  onFilterPeriodChange: (period: AppointmentPeriod) => void;
  bookingDateLabel: string;
};
