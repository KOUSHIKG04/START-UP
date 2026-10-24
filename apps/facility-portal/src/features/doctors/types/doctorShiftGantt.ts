import type { DeptSchedule } from "./doctorSchedules";

export type DoctorShiftGanttProps = {
  selectedDay: string;
  onDayChange: (day: string) => void;
  nextScheduledDay: string | null;
  departments: DeptSchedule[];
};
