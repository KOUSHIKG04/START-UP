import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CalendarDays, ChevronRight, Clock3, UserRound } from "lucide-react-native";
import { colors, fontFamilies, gradients, radius } from "@startup/design-tokens";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardSeparator,
} from "@startup/mobile-ui";
import type { Appointment } from "../types/appointment";

type BookingCardProps = {
  appointment: Appointment;
  onPress?: () => void;
};

export default function BookingCard({ appointment, onPress }: BookingCardProps) {
  return (
    <Card
      accessibilityLabel={`${appointment.consultationType} with ${appointment.doctorName} on ${appointment.date}`}
      backgroundColor={gradients.patientBanner.colors[0]}
      borderRadius={radius.lg}
      gap={11}
      onPress={onPress}
      padding={16}
    >
      <LinearGradient
        pointerEvents="none"
        colors={gradients.patientBanner.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      />
      <Text style={styles.type}>{appointment.consultationType}</Text>
      <CardHeader gap={11}>
        <View style={styles.avatar}>
          <UserRound color={colors.white} size={22} strokeWidth={1.8} />
        </View>
        <CardContent gap={1} style={styles.identity}>
          <Text numberOfLines={1} style={styles.name}>
            {appointment.doctorName}
          </Text>
          <Text style={styles.specialty}>{appointment.specialty}</Text>
        </CardContent>
        <CardAction style={styles.chevron}>
          <ChevronRight color={colors.patient.primaryDark} size={19} strokeWidth={2.3} />
        </CardAction>
      </CardHeader>
      <CardSeparator color="#FFFFFF55" />
      <View style={styles.details}>
        <BookingDetail
          icon={<CalendarDays color={colors.white} size={18} strokeWidth={1.8} />}
          label="Date"
          value={appointment.date}
        />
        <BookingDetail
          icon={<Clock3 color={colors.white} size={18} strokeWidth={1.8} />}
          label="Time"
          value={appointment.time}
        />
      </View>
    </Card>
  );
}

function BookingDetail({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detail}>
      {icon}
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.lg,
  },
  type: {
    color: colors.white,
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
  },
  avatar: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "#FFFFFF42",
  },
  identity: { flex: 1 },
  name: {
    color: colors.white,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 19,
  },
  specialty: {
    color: "#D8F1EF",
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    lineHeight: 15,
  },
  chevron: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: colors.patient.surface,
  },
  details: {
    flexDirection: "row",
    gap: 14,
  },
  detail: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailCopy: { minWidth: 0, flex: 1 },
  detailLabel: {
    color: "#C8EDE9",
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 13,
  },
  detailValue: {
    color: colors.white,
    fontFamily: fontFamilies.semibold,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },
});
