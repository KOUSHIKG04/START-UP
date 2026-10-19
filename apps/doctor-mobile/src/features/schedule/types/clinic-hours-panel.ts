export type ClinicHoursPanelProps = {
  title?: string;
  start: string;
  end: string;
  onUpdate: (changes: Partial<{ start: string; end: string }>) => void;
};
