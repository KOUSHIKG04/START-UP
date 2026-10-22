import type { OnlineScheduleCardProps } from "../types/booking-status";
import { styles } from "./BookingStatus.styles";

import { AppText as Text } from "@startup/mobile-ui";
import { View } from "react-native";
import { CalendarDays, Clock3 } from "lucide-react-native";
import { colors, radius } from "@startup/design-tokens";
import { Card } from "@startup/mobile-ui";

export function OnlineScheduleCard({ appointment }: OnlineScheduleCardProps) {
  return (
    <Card
      variant="outlined"
      borderRadius={radius.md}
      gap={10}
      padding={16}
      style={styles.cardSurface}
    >
      <Text variant="cardHeading" style={styles.onlineDoctorName}>
        {appointment.doctorName}
      </Text>
      <View style={styles.scheduleRow}>
        <Clock3 color={colors.patient.primaryDark} size={18} />
        <Text variant="label" style={styles.scheduleLabel}>
          Time
        </Text>
        <Text variant="bodyEmphasis" style={styles.scheduleValue}>
          {appointment.time}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <CalendarDays color={colors.patient.primaryDark} size={18} />
        <Text variant="label" style={styles.scheduleLabel}>
          Date
        </Text>
        <Text variant="bodyEmphasis" style={styles.scheduleValue}>
          {appointment.date}
        </Text>
      </View>
    </Card>
  );
}
