import { Pressable, StyleSheet, View } from "react-native";
import { ChevronRight, User } from "lucide-react-native";
import { Button } from "@startup/mobile-ui";
import { fontFamilies } from "@startup/design-tokens";
import { patients, modeLabels } from "../../../data/demo";
import { useDoctorStore } from "../../../stores/useDoctorStore";
import type { Appointment } from "../../../types/doctor";
import { openAppointment, visitRoute } from "../../consultations/utils/consultation";
import { router } from "expo-router";
import { Heading, Label, palette, ui } from "../../../components/DoctorScreen";
export function PatientCard({
  appointment,
  home = false,
}: {
  appointment: Appointment;
  home?: boolean;
}) {
  const patient = patients.find((p) => p.id === appointment.patientId)!;
  const completed = useDoctorStore((s) =>
    s.completedIds.includes(appointment.id)
  );
  const open = () =>
    completed
      ? router.push(visitRoute("clinical-notes", appointment))
      : openAppointment(appointment);
  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${patient.name}, ${modeLabels[appointment.mode]}, ${completed ? "completed" : "waiting"}. Open appointment`} onPress={open} style={({ pressed }) => [ui.row, pressed && { opacity: 0.88 }]}>
        <View
          style={[
            styles.avatar,
            { width: home ? 40 : 52, height: home ? 40 : 52 },
          ]}
        >
          <User size={home ? 25 : 28} color="white" />
        </View>
        <View style={ui.flex}>
          <Heading style={styles.white}>{patient.name}</Heading>
          <Label style={styles.secondary}>
            {home
              ? `${patient.gender}, ${patient.age} • Queue No: #${appointment.queue}`
              : `${patient.gender}, Age - ${patient.age}`}
          </Label>
          {!home && <Label style={styles.time}>{appointment.time}</Label>}
        </View>
        <View style={styles.badge}>
          <Label style={styles.badgeText}>
            {home
              ? completed
                ? "COMPLETED"
                : "WAITING"
              : modeLabels[appointment.mode].toUpperCase()}
          </Label>
        </View>
        {!home && (
          <View style={styles.arrow}>
            <ChevronRight size={20} color={palette.primary} />
          </View>
        )}
      </Pressable>
      {home && (
        <>
          <View style={ui.between}>
            <Label style={styles.secondary}>
              Type:{" "}
              <Label style={styles.time}>
                {appointment.mode === "clinic"
                  ? "In-Clinic Consultation"
                  : appointment.mode === "online"
                    ? "Video Call Consultation"
                    : "Home Visit"}
              </Label>
            </Label>
            <Label style={styles.time}>
              {appointment.id === "clinic-meera"
                ? "10:15 AM"
                : appointment.time}
            </Label>
          </View>
          {!completed && (
            <Button
              label="Start Consultation"
              theme="doctor"
              onPress={open}
              style={{ backgroundColor: palette.white }}
              labelStyle={{ color: palette.primary }}
            />
          )}
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 14,
    borderRadius: 16,
    backgroundColor: palette.card,
  },
  avatar: {
    borderRadius: 26,
    backgroundColor: "rgba(230,247,246,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  white: { color: palette.white, fontSize: 16 },
  secondary: { color: "#D4F0EC", fontSize: 12, lineHeight: 18 },
  time: {
    color: palette.white,
    fontSize: 12,
    fontFamily: fontFamilies.semibold,
  },
  badge: {
    backgroundColor: "#DEF5F2",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  badgeText: {
    color: palette.dark,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: fontFamilies.bold,
  },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});
