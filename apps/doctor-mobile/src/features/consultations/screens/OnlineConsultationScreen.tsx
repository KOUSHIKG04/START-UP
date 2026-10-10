import { LiveConsultationCall } from "../components/LiveConsultationCall";
import { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AudioSession, LiveKitRoom, registerGlobals } from "@livekit/react-native";
import { getOnlineVideoToken, startOnlineAppointment } from "@startup/data-access";
import { ChevronLeft, MessageCircle, MicOff, Mic, SwitchCamera, PhoneOff, User } from "lucide-react-native";
import { Button, Loader, ModalSurface, useToast, useToastFeedback } from "@startup/mobile-ui";
import {
  Heading,
  IconButton,
  Label,
  MissingPatient,
} from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";
import { useVisit, visitRoute } from "../utils/consultation";
import { useOnlineVisit } from "../utils/useOnlineVisit";
import { supabase } from "../../../services/supabase";

registerGlobals();
export function OnlineConsultationScreen({ initialChat = false }: { initialChat?: boolean } = {}) {
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const live = useOnlineVisit(appointmentId);
  if (live.isLive) return <LiveOnlineConsultation appointmentId={appointmentId!} initialChat={initialChat} />;
  return <DemoOnlineConsultation />;
}

function DemoOnlineConsultation() {
  const { patient, appointment } = useVisit();
  const [muted, setMuted] = useState(false);
  const [front, setFront] = useState(true);
  const [ending, setEnding] = useState(false);
  if (!patient || !appointment) return <MissingPatient />;
  return (
    <SafeAreaView style={styles.screen}>
      <View style={ui.row}>
        <IconButton
          label="Go back"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/appointments")
          }
        >
          <ChevronLeft size={26} color={palette.primary} />
        </IconButton>
        <Heading>{patient.name}</Heading>
      </View>
      <View style={styles.stage}>
        <User size={30} color={palette.primary} />
        <Label>Demo consultation Ã‚Â· Video is not connected</Label>
        {ending && (
          <View style={styles.endPanel}>
            <Heading>End demo call?</Heading>
            <Label>Continue with clinical notes for {patient.name}.</Label>
            <Button
              theme="doctor"
              label="Continue to clinical notes"
              onPress={() => {
                setEnding(false);
                router.replace(visitRoute("clinical-notes", appointment));
              }}
            />
            <Button
              theme="doctor"
              variant="secondary"
              label="Stay in call"
              onPress={() => setEnding(false)}
            />
          </View>
        )}
      </View>
      <View style={styles.self}>
        <User size={26} color="white" />
        <Label style={{ color: "white", fontSize: 11 }}>
          {front ? "You" : "Back camera"}
          {muted ? " Ã‚Â· Muted" : ""}
        </Label>
      </View>
      <View style={styles.controls}>
        <IconButton
          label="Switch camera preview"
          style={styles.control}
          onPress={() => setFront(!front)}
        >
          <SwitchCamera size={27} color="white" />
        </IconButton>
        <IconButton
          label={muted ? "Unmute microphone" : "Mute microphone"}
          style={[styles.control, muted && { backgroundColor: palette.dark }]}
          onPress={() => setMuted(!muted)}
        >
          {muted ? (
            <MicOff size={25} color="white" />
          ) : (
            <Mic size={25} color="white" />
          )}
        </IconButton>
        <IconButton
          label="Chat with patient"
          style={styles.control}
          onPress={() => router.push(visitRoute("chat", appointment))}
        >
          <MessageCircle size={25} color="white" />
        </IconButton>
        <IconButton
          label="End consultation call"
          style={[styles.control, { backgroundColor: palette.danger }]}
          onPress={() => setEnding(true)}
        >
          <PhoneOff size={26} color="white" />
        </IconButton>
      </View>
    </SafeAreaView>
  );
}

function LiveOnlineConsultation({ appointmentId, initialChat }: { appointmentId: string; initialChat: boolean }) {
  const { showToast } = useToast();
  const live = useOnlineVisit(appointmentId);
  const queryClient = useQueryClient();
  const start = useMutation({
    mutationFn: () => startOnlineAppointment(supabase!, appointmentId),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["doctor-clinic-appointments"] }); },
  });
  const token = useQuery({
    queryKey: ["online-video-token", appointmentId],
    queryFn: () => getOnlineVideoToken(supabase!, appointmentId),
    enabled: Boolean(live.appointment && live.appointment.status === "in_consultation" && supabase),
    staleTime: 5 * 60 * 1000,
  });
  useToastFeedback({ error: start.isError ? "Could not start consultation. Check its scheduled time and status." : token.error instanceof Error ? token.error.message : "" });
  useEffect(() => {
    if (!token.data) return;
    void AudioSession.startAudioSession().catch(() => showToast({ title: "Audio unavailable", message: "Check microphone permissions.", type: "error" }));
    return () => { void AudioSession.stopAudioSession().catch(() => undefined); };
  }, [token.data, showToast]);
  const appointment = live.appointment;
  if (live.loading) return <SafeAreaView style={styles.screen}><Loader theme="doctor" size="large" style={{ flex: 1 }} /></SafeAreaView>;
  if (!appointment) return <MissingPatient />;
  if (appointment.status === "confirmed") return <SafeAreaView style={styles.screen}>
    <Heading>{appointment.patient_name}</Heading>
    <Label>Start the scheduled consultation when the patient is ready.</Label>
    <Button loading={start.isPending} theme="doctor" label="Start consultation" disabled={start.isPending} onPress={() => start.mutate()} />
  </SafeAreaView>;
  if (appointment.status !== "in_consultation") return <MissingPatient />;
  if (!token.data) return <SafeAreaView style={styles.screen}>
    <Heading>{appointment.patient_name}</Heading>
    <Loader theme="doctor" size="large" />
  </SafeAreaView>;
  return <LiveKitRoom serverUrl={token.data.serverUrl} token={token.data.participantToken} connect audio video onError={error => showToast({ title: "Call connection failed", message: error.message, type: "error" })} onMediaDeviceFailure={() => showToast({ title: "Camera or microphone unavailable", message: "Check permissions. You can still use consultation chat.", type: "error" })}>
    <LiveVideoStage appointmentId={appointmentId} patientName={appointment.patient_name} patientId={appointment.patient_id} initialChat={initialChat} />
  </LiveKitRoom>;
}

function LiveVideoStage({ appointmentId, patientName, patientId, initialChat }: { appointmentId: string; patientName: string; patientId: string; initialChat: boolean }) {
  const [ending, setEnding] = useState(false);
  const back = () => router.canGoBack() ? router.back() : router.replace("/appointments");
  return <View style={{ flex: 1 }}>
    <LiveConsultationCall appointmentId={appointmentId} name={patientName} active initialChat={initialChat} onBack={back} onEnd={() => setEnding(true)} />
    <ModalSurface visible={ending} onClose={() => setEnding(false)}>
      <View style={{ gap: 16 }}><Heading>End call?</Heading><Label>Continue with clinical notes for {patientName}.</Label>
        <Button theme="doctor" label="Continue to clinical notes" onPress={() => { setEnding(false); router.replace({ pathname: "/clinical-notes", params: { appointmentId, patientId, mode: "online" } }); }} />
        <Button theme="doctor" variant="outline" label="Stay in call" onPress={() => setEnding(false)} />
      </View>
    </ModalSurface>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#CFEDEA", padding: 16 },
  liveScreen: { flex: 1, backgroundColor: "#CFEDEA" },
  liveStage: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  liveHeader: { position: "absolute", top: 12, left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  liveSelf: { position: "absolute", right: 30, bottom: 150, width: 101, height: 131, backgroundColor: "#0A9E96", borderRadius: 26, alignItems: "center", justifyContent: "center", gap: 8 },
  liveControls: { position: "absolute", left: 38, right: 38, bottom: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  liveDeviceError: { position: "absolute", left: 16, right: 16, bottom: 112 },
  liveEndPanel: { position: "absolute", left: 16, right: 16, padding: 20, gap: 14, borderRadius: 18, backgroundColor: "white" },
  stage: { flex: 1, alignItems: "center", justifyContent: "center" },
  self: {
    width: 100,
    height: 132,
    backgroundColor: "#0A9E96",
    borderRadius: 26,
    alignSelf: "flex-end",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 32,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: 24,
    gap: 10,
  },
  control: {
    width: 58,
    height: 64,
    borderRadius: 25,
    backgroundColor: palette.primary,
  },
  endPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    padding: 20,
    gap: 14,
    borderRadius: 18,
    backgroundColor: "white",
  },
});
