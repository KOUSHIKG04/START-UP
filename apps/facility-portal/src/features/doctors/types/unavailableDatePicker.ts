export type UnavailableDatePickerProps = {
  value: string;
  onChange: (date: string) => void;
  timeZone?: string;
  disabled: boolean;
  minDate?: string;
  label?: string;
};
