import type { ReactNode } from "react";
import type {
  BedInventoryProjection,
  ClinicAppointment,
} from "@startup/contracts";

export type DashboardScreenProps = {
  doctorAction: ReactNode;
  doctorRequests?: ReactNode;
  inventory: BedInventoryProjection[];
  appointments: ClinicAppointment[];
  weeklyDoctors: {
    id: string;
    name: string;
    speciality: string;
    days: boolean[];
  }[];
  loadError?: string;
  acceptAppointment: (input: unknown) => Promise<{ error: string | null }>;
};
