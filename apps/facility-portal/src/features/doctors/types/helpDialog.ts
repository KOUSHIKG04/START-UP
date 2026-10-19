import { type ReactNode } from "react";
export type HelpDialogProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};
