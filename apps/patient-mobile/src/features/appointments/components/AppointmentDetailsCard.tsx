import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Building2,
  CalendarClock,
  CalendarDays,
  Hash,
  MapPin,
  Stethoscope,
} from "lucide-react-native";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import { Card, CardSeparator, Chip } from "@startup/mobile-ui";
import type { Appointment } from "@/types/appointment";

export default function AppointmentDetailsCard({
  appointment,
}: {
  appointment: Appointment;
}) {
  return (
    <Card borderRadius={radius.md} gap={0} padding={16}>
      <View style={styles.heading}>
        <CalendarDays color={colors.patient.primaryDark} size={19} />
        <Text style={styles.title}>Appointment Details</Text>
      </View>
      <CardSeparator color="#E7ECEF" />
      <DetailRow
        icon={<Stethoscope size={17} color={colors.textSecondary} />}
        label="Consultation Type"
        value={
          <Chip
            label={appointment.consultationType}
            style={styles.typeChip}
            labelStyle={styles.typeChipLabel}
          />
        }
      />
      <DetailRow
        icon={<Hash size={17} color={colors.textSecondary} />}
        label="Appointment ID"
        value={appointment.id}
      />
      <DetailRow
        icon={<CalendarClock size={17} color={colors.textSecondary} />}
        label="Date & Time"
        value={`${appointment.date}, ${appointment.time.split(" – ")[0]}`}
      />
      <DetailRow
        icon={<Building2 size={17} color={colors.textSecondary} />}
        label="Hospital"
        value={appointment.hospital}
      />
      <DetailRow
        icon={<MapPin size={17} color={colors.textSecondary} />}
        label="Location"
        value={appointment.location}
        last
      />
    </Card>
  );
}

function DetailRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.lastRow]}>
      <View style={styles.labelGroup}>
        {icon}
        <Text style={styles.label}>{label}</Text>
      </View>
      {typeof value === "string" ? (
        <Text numberOfLines={2} style={styles.value}>
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 13,
  },
  title: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E7ECEF",
  },
  lastRow: { borderBottomWidth: 0 },
  labelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.semibold,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },
  value: {
    maxWidth: "54%",
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
    textAlign: "right",
  },
  typeChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 0,
    backgroundColor: "#EFF6FF",
  },
  typeChipLabel: {
    color: "#3B82F6",
    fontFamily: fontFamilies.semibold,
    fontSize: 10,
  },
});
