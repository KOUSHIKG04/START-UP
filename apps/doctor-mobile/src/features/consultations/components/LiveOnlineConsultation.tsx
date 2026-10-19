import { LiveVideoStage } from "./LiveVideoStage";
import { styles } from "./OnlineConsultation.styles";
import { useLiveOnlineConsultation } from "../hooks/useLiveOnlineConsultation";
import type { LiveOnlineConsultationProps } from "../types/live-online-consultation";
import { SafeAreaView } from "react-native-safe-area-context";
import { LiveKitRoom } from "@livekit/react-native";
import { Button, Loader } from "@startup/mobile-ui";
import {
  Heading,
  Label,
  MissingPatient,
} from "../../../components/DoctorScreen";
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
  if (!appointment) return <MissingPatient />;
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
  if (appointment.status !== "in_consultation") return <MissingPatient />;
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
