import { LiveVideoStage } from "./LiveVideoStage";
import { styles } from "./OnlineConsultation.styles";
import { useLiveOnlineConsultation } from "../hooks/useLiveOnlineConsultation";
import type { LiveOnlineConsultationProps } from "../types/live-online-consultation";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LiveKitRoom } from "@livekit/react-native";
import { Button, Loader } from "@startup/mobile-ui";
import { Heading, Label, DoctorScreen } from "../../../components/DoctorScreen";
import { appointmentRecoveryView } from "@startup/contracts";

export function LiveOnlineConsultation({
  appointmentId,
  initialChat,
}: LiveOnlineConsultationProps) {
  const { showToast, live, start, token, appointment } =
    useLiveOnlineConsultation({ appointmentId, initialChat });
  if (live.loading)
    return (
      <SafeAreaView style={styles.screen}>
        <Loader theme="doctor" size="large" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  if (!appointment)
    return (
      <DoctorScreen title="Video consultation" bottomNav={false}>
        <Label>
          {live.error
            ? "Could not load this consultation. Return to appointments and try again."
            : "This consultation is unavailable for your account."}
        </Label>
        <Button
          theme="doctor"
          label="Back to appointments"
          onPress={() => router.replace("/appointments")}
        />
      </DoctorScreen>
    );
  if (appointment.status === "completed")
    return (
      <DoctorScreen
        title="Consultation completed"
        bottomNav={false}
        onBackPress={() => router.replace("/appointments")}
      >
        <Heading>{appointment.patient_name}</Heading>
        <Label>This consultation is signed and saved.</Label>
        <Button
          theme="doctor"
          label="View consultation record"
          onPress={() =>
            router.replace({
              pathname: "/clinical-notes",
              params: {
                appointmentId,
                patientId: appointment.patient_id,
                mode: "online",
              },
            })
          }
        />
        <Button
          theme="doctor"
          variant="outline"
          label="Back to appointments"
          onPress={() => router.replace("/appointments")}
        />
      </DoctorScreen>
    );
  if (
    appointment.status === "confirmed" &&
    !appointmentRecoveryView(appointment).canJoin
  )
    return (
      <DoctorScreen title="Appointment time passed" bottomNav={false}>
        <Heading>{appointment.patient_name}</Heading>
        <Label>
          Attendance needs review. Open the appointment to record the outcome or
          arrange a new time.
        </Label>
        <Button
          theme="doctor"
          label="Review appointment"
          onPress={() =>
            router.replace({
              pathname: "/appointment-details",
              params: { appointmentId },
            })
          }
        />
      </DoctorScreen>
    );
  if (appointment.status === "confirmed")
    return (
      <SafeAreaView style={styles.screen}>
        <Heading>{appointment.patient_name}</Heading>
        <Label>
          Start the scheduled consultation when the patient is ready.
        </Label>
        <Button
          loading={start.isPending}
          theme="doctor"
          label="Start consultation"
          disabled={start.isPending}
          onPress={() => start.mutate()}
        />
      </SafeAreaView>
    );
  if (appointment.status !== "in_consultation")
    return (
      <DoctorScreen title="Video consultation" bottomNav={false}>
        <Label>
          This appointment is {appointment.status.replaceAll("_", " ")}.
        </Label>
        <Button
          theme="doctor"
          label="Back to appointments"
          onPress={() => router.replace("/appointments")}
        />
      </DoctorScreen>
    );
  if (!token.data)
    return (
      <SafeAreaView style={styles.screen}>
        <Heading>{appointment.patient_name}</Heading>
        <Loader theme="doctor" size="large" />
      </SafeAreaView>
    );
  return (
    <LiveKitRoom
      serverUrl={token.data.serverUrl}
      token={token.data.participantToken}
      connect
      audio
      video
      onError={(error) =>
        showToast({
          title: "Call connection failed",
          message: error.message,
          type: "error",
        })
      }
      onMediaDeviceFailure={() =>
        showToast({
          title: "Camera or microphone unavailable",
          message: "Check permissions. You can still use consultation chat.",
          type: "error",
        })
      }
    >
      <LiveVideoStage
        appointmentId={appointmentId}
        patientName={appointment.patient_name}
        patientId={appointment.patient_id}
        initialChat={initialChat}
      />
    </LiveKitRoom>
  );
}
