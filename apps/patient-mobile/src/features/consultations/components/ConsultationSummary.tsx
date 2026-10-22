import type { ConsultationSummaryProps } from "../types/visit-session";
import { styles } from "./CompletionView.styles";

import { AppText as Text } from "@startup/mobile-ui";
import { View } from "react-native";
import { CalendarDays, ClipboardList, UserRound } from "lucide-react-native";
import { colors, radius } from "@startup/design-tokens";
import { Card } from "@startup/mobile-ui";

export function ConsultationSummary({ appointment }: ConsultationSummaryProps) {
  return (
    <Card
      variant="outlined"
      borderRadius={radius.md}
      backgroundColor={colors.white}
      gap={0}
      padding={0}
      style={styles.summaryCard}
    >
      <View style={styles.summaryHeading}>
        <ClipboardList color={colors.patient.primaryDark} size={20} />
        <Text variant="cardHeading" style={styles.cardTitle}>
          Consultation Summary
        </Text>
      </View>
      <View style={styles.summaryRow}>
        <View style={styles.summaryLabel}>
          <UserRound color={colors.patient.primaryDark} size={18} />
          <Text variant="body" style={styles.secondaryText}>
            Doctor
          </Text>
        </View>
        <Text variant="bodyEmphasis" style={styles.summaryValue}>
          {appointment.doctorName}
        </Text>
      </View>
      <View style={styles.summaryRow}>
        <View style={styles.summaryLabel}>
          <CalendarDays color={colors.patient.primaryDark} size={18} />
          <Text variant="body" style={styles.secondaryText}>
            Date & Time
          </Text>
        </View>
        <Text variant="bodyEmphasis" style={styles.summaryValue}>
          {appointment.date}, {appointment.time.split(" – ")[0]}
        </Text>
      </View>
    </Card>
  );
}
