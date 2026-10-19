import { type ReactNode } from "react";

export type FrameProps = {
  children: ReactNode;
  title: string;
  onBack?: () => void;
};
