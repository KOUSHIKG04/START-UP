import type { AppTheme } from "../utils/appTheme";

export type CalendarProps = {
  value?: string;
  onChange: (day: string) => void;
  minDate?: string;
  maxDate?: string;
  theme?: AppTheme;
};
