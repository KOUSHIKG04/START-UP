import type { ScheduleSummaryProps } from "../types/schedule-summary";
import { AppText as Text } from "@startup/mobile-ui";
import { StyleSheet, View } from "react-native";
import {
  Building2,
  CalendarDays,
  Clock3,
  UserRound,
} from "lucide-react-native";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import { Card } from "@startup/mobile-ui";

export function ScheduleSummary({ appointment }: ScheduleSummaryProps) {
  return (
    <Card
      variant="outlined"
      borderRadius={radius.md}
      backgroundColor={colors.white}
      gap={13}
      padding={16}
    >
      <View style={styles.doctorHeaderRow}>
        <View style={styles.doctorAvatar}>
          <UserRound
            color={colors.patient.primaryDark}
            size={25}
            strokeWidth={2}
          />
        </View>

        <View style={styles.doctorInfo}>
          <View style={styles.doctorNameRow}>
            <Text
              variant="cardHeading"
              numberOfLines={1}
              style={styles.doctorName}
            >
              {appointment.doctorName}
            </Text>
          </View>

          <Text
            variant="label"
            numberOfLines={1}
            style={styles.doctorQualification}
          >
            {appointment.qualification}
            {appointment.experience ? ` • ${appointment.experience}` : ""}
          </Text>
        </View>
      </View>

      <View style={styles.scheduleGrid}>
        <View style={styles.scheduleCell}>
          <View style={styles.scheduleIconSurface}>
            <CalendarDays
              color={colors.patient.primaryDark}
              size={15}
              strokeWidth={2}
            />
          </View>
          <View style={styles.scheduleCellText}>
            <Text variant="label" style={styles.scheduleCellLabel}>
              Date
            </Text>
            <Text
              variant="bodyEmphasis"
              numberOfLines={1}
              style={styles.scheduleCellValue}
            >
              {appointment.date}
            </Text>
          </View>
        </View>

        <View style={styles.scheduleCell}>
          <View style={styles.scheduleIconSurface}>
            <Clock3
              color={colors.patient.primaryDark}
              size={15}
              strokeWidth={2}
            />
          </View>
          <View style={styles.scheduleCellText}>
            <Text variant="label" style={styles.scheduleCellLabel}>
              Time
            </Text>
            <Text
              variant="bodyEmphasis"
              numberOfLines={1}
              style={styles.scheduleCellValue}
            >
              {appointment.time}
            </Text>
          </View>
        </View>
      </View>

      {appointment.hospital ? (
        <View style={styles.hospitalRow}>
          <Building2
            color={colors.patient.primaryDark}
            size={13}
            strokeWidth={2}
          />
          <Text variant="body" numberOfLines={1} style={styles.hospitalText}>
            {appointment.hospital}
            {appointment.location ? ` • ${appointment.location}` : ""}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  doctorHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  doctorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.patient.surface,
    borderWidth: 1,
    borderColor: colors.patient.surfaceBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  doctorInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  doctorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  doctorName: {
    flex: 1,
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  doctorQualification: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    lineHeight: 15,
  },
  scheduleGrid: {
    flexDirection: "row",
    gap: 10,
  },
  scheduleCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.patient.surface,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  scheduleIconSurface: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleCellText: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  scheduleCellLabel: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  scheduleCellValue: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    fontWeight: "700",
  },
  hospitalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: "#F8FAFC",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  hospitalText: {
    flex: 1,
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    lineHeight: 14,
  },
});
