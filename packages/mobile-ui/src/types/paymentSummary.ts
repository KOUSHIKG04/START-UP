import type { ReactNode } from "react";
import type { MobileThemeName } from "@startup/design-tokens";

export type PaymentSummaryProps = {
  title: string;
  amount?: string;
  amountLabel?: string;
  status?: string;
  theme?: MobileThemeName;
  testMode?: boolean;
  children?: ReactNode;
  footer?: ReactNode;
};
