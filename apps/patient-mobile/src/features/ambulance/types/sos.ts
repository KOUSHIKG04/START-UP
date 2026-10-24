import { type ReactNode } from "react";

export type SosEmergencyScreenProps = {
  onCancel: () => void;
  onCallEmergency: () => void;
};

export type DarkButtonProps = {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  compact?: boolean;
};

export type HotlineProps = {
  label: string;
  onPress: () => void;
};
