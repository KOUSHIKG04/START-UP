import type { AppTheme } from "../utils/appTheme";

export type ClockTimePickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  endOfDay?: boolean;
  theme?: AppTheme;
};
