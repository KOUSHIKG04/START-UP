import { useOnlineVisit } from "../hooks/useOnlineVisit";
import type { OnlineVisitFlowProps } from "../types/visit-session";
export type { OnlineVisitFlowProps } from "../types/visit-session";
import { AppText as Text } from "@startup/mobile-ui";

import { View, StyleSheet } from "react-native";

import { LiveKitRoom, registerGlobals } from "@livekit/react-native";

import { Button, Loader } from "@startup/mobile-ui";
import { colors } from "@startup/design-tokens";

import { LiveConsultationCall } from "./LiveConsultationCall";

registerGlobals();

export function OnlineVisitFlow({
  appointment,
  initialChat,
  onBackPress,
  onComplete,
}: OnlineVisitFlowProps) {
  const {
    appointmentId,
    live,
    showToast,
    activeAppointment,
    context,
    token,
    leave,
  } = useOnlineVisit({ appointment, initialChat, onBackPress, onComplete });
  if (context.isLoading || token.isLoading)
    return (
      <View style={styles.wait}>
        <Loader theme="patient" size="large" />
      </View>
    );
  if (!live || !context.data || !token.data)
    return (
      <View style={styles.wait}>
        <Text
          variant="body"
          style={{
            color: colors.patient.text,
            textAlign: "center",
            padding: 24,
          }}
        >
          This consultation is not ready to join. Check its scheduled time and
          confirmation.
        </Text>
        <Button theme="patient" label="Go back" onPress={onBackPress} />
        <Button
          theme="patient"
          variant="outline"
          label="Retry"
          onPress={() => {
            void context.refetch();
            void token.refetch();
          }}
        />
      </View>
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
      <LiveConsultationCall
        appointmentId={appointmentId!}
        name={appointment.doctorName}
        active={activeAppointment?.status === "in_consultation"}
        initialChat={initialChat}
        onBack={onBackPress}
        onEnd={() => void leave()}
      />
    </LiveKitRoom>
  );
}
const styles = StyleSheet.create({
  wait: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.patient.surface,
  },
});
