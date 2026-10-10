import { useEffect, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { AudioSession, LiveKitRoom, registerGlobals } from "@livekit/react-native";
import { uuidSchema, type ClinicAppointment } from "@startup/contracts";
import { getOnlineJoinContext, getOnlineVideoToken, listClinicAppointments } from "@startup/data-access";
import { Button, Loader, useToast, useToastFeedback } from "@startup/mobile-ui";
import { colors } from "@startup/design-tokens";
import { supabase } from "../../../services/supabase";
import type { Appointment } from "../../appointments/types/appointment";
import { LiveConsultationCall } from "./LiveConsultationCall";

registerGlobals();
export interface OnlineVisitFlowProps { appointment: Appointment; initialChat: boolean; onBackPress: () => void; onComplete: () => void; }
export function OnlineVisitFlow({ appointment, initialChat, onBackPress, onComplete }: OnlineVisitFlowProps) {
  const appointmentId = appointment.backendId;
  const live = uuidSchema.safeParse(appointmentId).success;
  const completionShown = useRef(false);
  const leaving = useRef(false);
  const { showToast } = useToast();
  const appointmentStatus = useQuery({ queryKey: ["patient-clinic-appointments"], queryFn: () => listClinicAppointments(supabase!), enabled: Boolean(live && supabase), refetchInterval: 5000 });
  const activeAppointment = appointmentStatus.data?.find((item: ClinicAppointment) => item.id === appointmentId);
  useEffect(() => {
    if (activeAppointment?.status !== "completed" || completionShown.current) return;
    completionShown.current = true; onComplete();
  }, [activeAppointment?.status, onComplete]);
  const context = useQuery({ queryKey: ["online-context", appointmentId], queryFn: () => getOnlineJoinContext(supabase!, appointmentId!), enabled: Boolean(live && supabase) });
  const token = useQuery({ queryKey: ["online-video-token", appointmentId], queryFn: () => getOnlineVideoToken(supabase!, appointmentId!), enabled: Boolean(context.data && supabase), staleTime: 5 * 60 * 1000 });
  useToastFeedback({ error: token.error instanceof Error ? token.error.message : context.isError ? "Could not load this consultation." : "" });
  useEffect(() => {
    if (!token.data) return;
    void AudioSession.startAudioSession().catch(() => showToast({ title: "Audio unavailable", message: "Check microphone permissions.", type: "error" }));
    return () => { void AudioSession.stopAudioSession().catch(() => undefined); };
  }, [token.data, showToast]);
  async function leave() {
    if (leaving.current) return; leaving.current = true;
    try { const latest = await listClinicAppointments(supabase!);
      if (latest.some(item => item.id === appointmentId && item.status === "completed")) {
        if (!completionShown.current) { completionShown.current = true; onComplete(); }
      } else onBackPress();
    } catch { onBackPress(); } finally { leaving.current = false; }
  }
  if (context.isLoading || token.isLoading) return <View style={styles.wait}><Loader theme="patient" size="large" /></View>;
  if (!live || !context.data || !token.data) return <View style={styles.wait}><Text style={{ color: colors.patient.text, textAlign: "center", padding: 24 }}>This consultation is not ready to join. Check its scheduled time and confirmation.</Text><Button theme="patient" label="Go back" onPress={onBackPress} /><Button theme="patient" variant="outline" label="Retry" onPress={() => { void context.refetch(); void token.refetch(); }} /></View>;
  return <LiveKitRoom serverUrl={token.data.serverUrl} token={token.data.participantToken} connect audio video onError={error => showToast({ title: "Call connection failed", message: error.message, type: "error" })} onMediaDeviceFailure={() => showToast({ title: "Camera or microphone unavailable", message: "Check permissions. You can still use consultation chat.", type: "error" })}>
    <LiveConsultationCall appointmentId={appointmentId!} name={appointment.doctorName} active={activeAppointment?.status === "in_consultation"} initialChat={initialChat} onBack={onBackPress} onEnd={() => void leave()} />
  </LiveKitRoom>;
}
const styles = StyleSheet.create({ wait: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.patient.surface } });
