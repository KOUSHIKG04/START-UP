export type ClockDurationPickerProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (minutes: number) => void;
};
