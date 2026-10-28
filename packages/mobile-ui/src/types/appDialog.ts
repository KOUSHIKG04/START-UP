import type { ReactNode } from "react";
import type { MobileThemeName } from "@startup/design-tokens";

export type AppDialogProps = {
  visible: boolean;
  title: string;
  description?: string;
  theme?: MobileThemeName;
  busy?: boolean;
  children?: ReactNode;
  actions?: ReactNode;
  confirmLabel?: string;
  onConfirm?: () => void;
  cancelLabel?: string;
  onClose: () => void;
};
