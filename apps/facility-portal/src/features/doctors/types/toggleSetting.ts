export type ToggleSettingProps = {
  title: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
};
