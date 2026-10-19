export type DecimalSettingProps = {
  id: string;
  label: string;
  value: number | null;
  max: number;
  nullable?: boolean;
  disabled: boolean;
  onChange: (value: number | null) => void;
};
