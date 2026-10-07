import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CalendarDays, ChevronRight, Clock3, UserRound } from "lucide-react-native";
import { colors, fontFamilies, gradients, radius } from "@startup/design-tokens";
import { Card, CardContent, CardHeader, CardSeparator } from "@startup/mobile-ui";
import type { Appointment } from "../types/appointment";

export default function BookingCard({ appointment, onPress, statusLabel }: {
  appointment: Appointment;
  onPress?: () => void;
  statusLabel?: string;
}) {
  return <Card
    accessibilityRole={onPress ? "button" : undefined}
    accessibilityLabel={`${appointment.consultationType} with ${appointment.doctorName} on ${appointment.date}${onPress ? ". Open appointment details" : ""}`}
    onPress={onPress}
    backgroundColor={gradients.patientBanner.colors[0]}
    borderRadius={radius.lg}
    gap={11}
    padding={16}
  >
    <LinearGradient pointerEvents="none" colors={gradients.patientBanner.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradient} />
    <View style={styles.topRow}>
      <Text style={styles.type}>{appointment.consultationType}</Text>
      <View style={styles.statusBadge}>
        <View style={[styles.statusDot, appointment.status === "approved" ? styles.statusDotApproved : styles.statusDotPending]} />
        <Text style={styles.statusText}>{statusLabel ?? (appointment.status === "approved" ? "Confirmed" : "Pending")}</Text>
      </View>
    </View>
    <CardHeader gap={11}>
      <View style={styles.avatar}><UserRound color={colors.white} size={22} strokeWidth={1.8} /></View>
      <CardContent gap={1} style={styles.identity}>
        <Text numberOfLines={1} style={styles.name}>{appointment.doctorName}</Text>
        <Text style={styles.specialty}>{appointment.specialty}</Text>
      </CardContent>
      {onPress ? <View style={styles.chevron}><ChevronRight color={colors.patient.primaryDark} size={19} strokeWidth={2.3} /></View> : null}
    </CardHeader>
    <CardSeparator color="#FFFFFF44" />
    <View style={styles.details}>
      <View style={styles.detail}><CalendarDays color={colors.white} size={18} strokeWidth={1.8} /><View style={styles.detailCopy}><Text style={styles.detailLabel}>Date</Text><Text numberOfLines={1} style={styles.detailValue}>{appointment.date}</Text></View></View>
      <View style={styles.detail}><Clock3 color={colors.white} size={18} strokeWidth={1.8} /><View style={styles.detailCopy}><Text style={styles.detailLabel}>Time</Text><Text numberOfLines={1} style={styles.detailValue}>{appointment.time}</Text></View></View>
    </View>
    {onPress ? <Text style={styles.viewDetails}>View appointment details</Text> : null}
  </Card>;
}

const styles = StyleSheet.create({
  gradient: { ...StyleSheet.absoluteFill, borderRadius: radius.lg },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  type: { color: colors.white, fontFamily: fontFamilies.medium, fontSize: 14, lineHeight: 18 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: "#FFFFFF2E" },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotApproved: { backgroundColor: "#A7F3D0" },
  statusDotPending: { backgroundColor: "#FDE68A" },
  statusText: { color: colors.white, fontFamily: fontFamilies.medium, fontSize: 11, fontWeight: "500", textTransform: "capitalize" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF42", alignItems: "center", justifyContent: "center" },
  identity: { flex: 1 },
  name: { color: colors.white, fontFamily: fontFamilies.bold, fontSize: 15, fontWeight: "700", lineHeight: 19 },
  specialty: { color: "#D8F1EF", fontFamily: fontFamilies.regular, fontSize: 11, lineHeight: 15 },
  chevron: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: colors.patient.surface },
  details: { flexDirection: "row", gap: 14 },
  detail: { minWidth: 0, flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  detailCopy: { flex: 1, minWidth: 0 },
  detailLabel: { color: "#C8EDE9", fontFamily: fontFamilies.medium, fontSize: 10, lineHeight: 13 },
  detailValue: { color: colors.white, fontFamily: fontFamilies.semibold, fontSize: 11, lineHeight: 15 },
  viewDetails: { alignSelf: "flex-end", color: colors.white, fontFamily: fontFamilies.semibold, fontSize: 12 },
});
