export interface AppointmentsSummaryData {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
}

export type AppointmentsSummaryCardsProps = {
  summary: AppointmentsSummaryData;
};
