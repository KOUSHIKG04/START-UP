import type { ReactNode } from "react";

import type { PatientScreenProps } from "../../../types/screen";

export type ProfileScreenProps = PatientScreenProps;

export type ContactDetailProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

export type PrivacyModalProps = {
  visible: boolean;
  onClose: () => void;
};

export type ProfileActionProps = {
  icon: ReactNode;
  title: string;
  count?: string;
  neutralCount?: boolean;
  trailingIcon?: ReactNode;
  onPress: () => void;
};

export type ProfileIdentityProps = {
  initials: string;
  name: string;
  gender?: string | null;
  photoUrl?: string;
  children?: ReactNode;
  inverse?: boolean;
};

export type ProfileStatsProps = { age: string; blood: string };
