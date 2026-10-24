import type { ApprovedStatusProps } from "../types/booking-status";
import { styles } from "./BookingStatus.styles";

import { CheckCircle2 } from "lucide-react-native";
import { colors } from "@startup/design-tokens";
import { Button } from "@startup/mobile-ui";

export function ApprovedStatus({
  label,
  style,
  labelStyle,
}: ApprovedStatusProps) {
  return (
    <Button
      label={label}
      variant="primary"
      theme="patient"
      style={[styles.approvedButton, style]}
      labelStyle={[styles.approvedButtonLabel, labelStyle]}
      rightIcon={
        <CheckCircle2 color={colors.white} size={16} strokeWidth={2.2} />
      }
    />
  );
}
