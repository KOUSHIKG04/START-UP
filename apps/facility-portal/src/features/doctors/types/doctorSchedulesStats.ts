export type DoctorSchedulesStatsProps = {
  scheduleSummary: {
    total: number;
    available: number;
    surgery: number | null;
    emergency: number | null;
  };
};
