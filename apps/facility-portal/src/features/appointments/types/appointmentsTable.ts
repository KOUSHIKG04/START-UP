export interface AppointmentsPaginationData {
  range: string;
  total: number;
  currentPage: number;
  nextPages: number[];
  lastPage: number;
}

import type { ClinicAppointment } from "@startup/contracts";
import type { AppointmentAction, AppointmentPeriod } from "./appointments";

export type AppointmentsTableProps = {
  now: number;
  pageRows: ClinicAppointment[];
  pending: boolean;
  onManage: (item: ClinicAppointment) => void;
  onAct: (item: ClinicAppointment, action: AppointmentAction) => void;
  pagination: AppointmentsPaginationData;
  onPageChange: (page: number) => void;
  displayedCount: number;
  filterPeriod: AppointmentPeriod;
  onFilterPeriodChange: (period: AppointmentPeriod) => void;
  bookingDateLabel: string;
};
