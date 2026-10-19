import type { ReactNode } from "react";
export type PhoneOtpFormProps = {
  title: string;
  description: string;
  onSend: (phone: string) => Promise<void>;
  onVerify: (phone: string, code: string) => Promise<void>;
  configurationError?: string | null;
  footer?: ReactNode;
};
