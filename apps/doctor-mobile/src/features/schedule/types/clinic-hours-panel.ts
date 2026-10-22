export type ClinicHoursPanelProps = {
  blocks?: import("@startup/contracts").DoctorTimeBlock[];
  disabled?: boolean;
  title?: string;
  start: string;
  end: string;
  onUpdate: (
    changes: Partial<{
      start: string;
      end: string;
      timeBlocks: import("@startup/contracts").DoctorTimeBlock[];
    }>
  ) => void;
};
