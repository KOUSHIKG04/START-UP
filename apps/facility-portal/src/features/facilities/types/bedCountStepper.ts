export type BedCountStepperProps = {
  label: string;
  value: number;
  max: number;
  disabled: boolean;
  onCommit: (value: number) => void;
};
