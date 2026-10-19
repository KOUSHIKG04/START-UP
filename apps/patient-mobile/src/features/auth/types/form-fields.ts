import type { ReactNode } from "react";

export type BloodGroupSelectorProps = {
  bloodGroups: readonly string[];
  value: string;
  onChange: (group: string) => void;
  invalid?: boolean;
};

export type ProdAuthChoicesProps = {
  onContinueWithGoogle: () => void;
  onContinueWithPhone: () => void;
};

export type SelectDropdownProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (val: string) => void;
  leftIcon?: ReactNode;
};
