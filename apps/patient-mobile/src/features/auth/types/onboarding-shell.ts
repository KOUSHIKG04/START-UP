import { type ReactNode } from "react";

export type OnboardingShellProps = {
  children: ReactNode;
  onBack?: () => void;
  bottomArt?: boolean;
  scroll?: boolean;
  keepArtFixed?: boolean;
  showArt?: boolean;
  centerContent?: boolean;
};
