export type NumberSettingProps = {
  title: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
  stepper?: boolean;
  disabled?: boolean;
};
