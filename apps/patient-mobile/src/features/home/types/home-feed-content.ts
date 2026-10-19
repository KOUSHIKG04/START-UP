import { type ClinicAppointment } from "@startup/contracts";
export type HomeFeedContentProps = {
  upcoming?: ClinicAppointment[];
  isLoading: boolean;
  isError: boolean;
};
