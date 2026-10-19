import type { AppTheme } from "../utils/appTheme";

export type ClockDurationPickerProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (minutes: number) => void;
  disabled?: boolean;
  theme?: AppTheme;
};
