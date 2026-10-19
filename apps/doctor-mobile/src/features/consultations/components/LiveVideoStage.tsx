import type { LiveVideoStageProps } from "../types/live-video-stage";
import { LiveConsultationCall } from "./LiveConsultationCall";
import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Button, ModalSurface } from "@startup/mobile-ui";
import { Heading, Label } from "../../../components/DoctorScreen";
export function LiveVideoStage({
  appointmentId,
  patientName,
  patientId,
  initialChat,
}: LiveVideoStageProps) {
  const [ending, setEnding] = useState(false);
  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/appointments");
  return (
    <View style={{ flex: 1 }}>
      <LiveConsultationCall
        appointmentId={appointmentId}
        name={patientName}
        active
        initialChat={initialChat}
        onBack={back}
        onEnd={() => setEnding(true)}
      />
      <ModalSurface visible={ending} onClose={() => setEnding(false)}>
        <View style={{ gap: 16 }}>
          <Heading>End call?</Heading>
          <Label>Continue with clinical notes for {patientName}.</Label>
          <Button
            theme="doctor"
            label="Continue to clinical notes"
            onPress={() => {
              setEnding(false);
              router.replace({
                pathname: "/clinical-notes",
                params: { appointmentId, patientId, mode: "online" },
              });
            }}
          />
          <Button
            theme="doctor"
            variant="outline"
            label="Stay in call"
            onPress={() => setEnding(false)}
          />
        </View>
      </ModalSurface>
    </View>
  );
}
