import { Pressable, StyleSheet, View } from "react-native";
import { ChevronRight, User } from "lucide-react-native";
import { Button } from "@startup/mobile-ui";
import { fontFamilies } from "@startup/design-tokens";
import type { ClinicAppointment } from "@startup/contracts";
import { Heading, Label } from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";

export function PatientCard({ appointment, home = false, onOpen, onAction, actionLabel }: {
  appointment: ClinicAppointment;
  home?: boolean;
  onOpen: () => void;
  onAction?: () => void;
  actionLabel?: string;
}) {
  const completed = appointment.status === "completed";
  const time = new Date(appointment.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return <View style={styles.card}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${appointment.patient_name}, clinic, ${appointment.status.replaceAll("_", " ")}. Open appointment`} onPress={onOpen} style={({ pressed }) => [ui.row, pressed && { opacity: 0.88 }]}>
      <View style={[styles.avatar, { width: home ? 40 : 52, height: home ? 40 : 52 }]}><User size={home ? 25 : 28} color="white" /></View>
      <View style={ui.flex}><Heading style={styles.white}>{appointment.patient_name}</Heading><Label style={styles.secondary}>{home
        ? `${appointment.patient_gender ?? "Gender unavailable"}, ${appointment.patient_age_years ?? "age unavailable"} • Queue No: ${appointment.ticket_number ? `#${appointment.ticket_number}` : "pending"}`
        : `${appointment.patient_gender ?? "Gender unavailable"}, Age - ${appointment.patient_age_years ?? "unavailable"}`}</Label>{!home ? <Label style={styles.time}>{time}</Label> : null}</View>
      <View style={styles.badge}><Label style={styles.badgeText}>{home ? completed ? "COMPLETED" : (appointment.queue_state ?? appointment.status).replaceAll("_", " ").toUpperCase() : appointment.visit_mode === "online" ? "ONLINE" : "CLINIC VISIT"}</Label></View>
      {!home ? <View style={styles.arrow}><ChevronRight size={20} color={palette.primary} /></View> : null}
    </Pressable>
    {home ? <><View style={ui.between}><Label style={styles.secondary}>Type: <Label style={styles.time}>In-Clinic Consultation</Label></Label><Label style={styles.time}>{time}</Label></View>{!completed && onAction ? <Button label={actionLabel ?? "Start Consultation"} theme="doctor" onPress={onAction} style={{ backgroundColor: palette.white }} labelStyle={{ color: palette.primary }} /> : null}</> : null}
  </View>;
}
const styles = StyleSheet.create({ card: { padding: 16, gap: 14, borderRadius: 16, backgroundColor: palette.card }, avatar: { borderRadius: 26, backgroundColor: "rgba(230,247,246,0.35)", alignItems: "center", justifyContent: "center" }, white: { color: palette.white, fontSize: 16 }, secondary: { color: "#D4F0EC", fontSize: 12, lineHeight: 18 }, time: { color: palette.white, fontSize: 12, fontFamily: fontFamilies.semibold }, badge: { backgroundColor: "#DEF5F2", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 10 }, badgeText: { color: palette.dark, fontSize: 10, lineHeight: 14, fontFamily: fontFamilies.bold }, arrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: palette.surface, alignItems: "center", justifyContent: "center" } });
