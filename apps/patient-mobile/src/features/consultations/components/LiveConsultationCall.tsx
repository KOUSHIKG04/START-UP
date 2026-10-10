import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { VideoTrack, isTrackReference, useConnectionState, useLocalParticipant, useRoomContext, useTracks } from "@livekit/react-native";
import { ConnectionState, Track, type LocalVideoTrack } from "livekit-client";
import { UserRound } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { ConsultationCall, useToast, useToastFeedback } from "@startup/mobile-ui";
import { listOnlineMessages, sendOnlineMessage, subscribeOnlineMessages } from "@startup/data-access";
import { supabase, useMobileSession } from "../../../services/supabase";

export function LiveConsultationCall({ appointmentId, name, active, initialChat = false, onBack, onEnd }: {
  appointmentId: string; name: string; active: boolean; initialChat?: boolean; onBack: () => void; onEnd: () => void;
}) {
  const room = useRoomContext();
  const connection = useConnectionState();
  const { isCameraEnabled, isMicrophoneEnabled } = useLocalParticipant();
  const tracks = useTracks([Track.Source.Camera]);
  const remote = tracks.find(track => isTrackReference(track) && !track.participant.isLocal);
  const local = tracks.find(track => isTrackReference(track) && track.participant.isLocal);
  const { profile } = useMobileSession();
  const client = useQueryClient();
  const { showToast } = useToast();
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const lock = useRef(false);
  const sendLock = useRef(false);
  const mounted = useRef(false);
  const front = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const messages = useQuery({ queryKey: ["online-messages", appointmentId], queryFn: () => listOnlineMessages(supabase!, appointmentId), enabled: Boolean(active && supabase), refetchInterval: active ? 4000 : false });
  useToastFeedback({ error: messages.isError ? "Could not refresh consultation messages. Try again." : "" });
  useEffect(() => {
    if (!active || !supabase) return;
    return subscribeOnlineMessages(supabase, appointmentId, () => { void client.invalidateQueries({ queryKey: ["online-messages", appointmentId] }); });
  }, [active, appointmentId, client]);
  async function device(action: () => Promise<unknown>, message: string) {
    if (lock.current) return;
    lock.current = true; setDeviceBusy(true);
    try { await action(); } catch { if (mounted.current) showToast({ title: message, message: "Check device permissions and try again.", type: "error" }); }
    finally { lock.current = false; if (mounted.current) setDeviceBusy(false); }
  }
  async function flip() {
    await device(async () => {
      const track = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track as LocalVideoTrack | undefined;
      if (!track || !room.localParticipant.isCameraEnabled) throw new Error("Camera unavailable");
      const constraints = { ...track.mediaStreamTrack.getConstraints(), facingMode: front.current ? "environment" : "user" };
      delete constraints.deviceId;
      await track.mediaStreamTrack.applyConstraints(constraints);
      front.current = !front.current;
    }, "Could not flip your camera");
  }
  async function send(body: string) {
    if (sendLock.current || !active || connection !== ConnectionState.Connected || !supabase) throw new Error("Call is not active");
    sendLock.current = true; setSending(true);
    try { await sendOnlineMessage(supabase, appointmentId, body, Crypto.randomUUID()); await client.invalidateQueries({ queryKey: ["online-messages", appointmentId] }); }
    catch (cause) { if (mounted.current) showToast({ title: "Could not send message", message: cause instanceof Error ? cause.message : "Try again.", type: "error" }); throw cause; }
    finally { sendLock.current = false; if (mounted.current) setSending(false); }
  }
  const fallback = (label: string) => <View style={styles.placeholder}><UserRound size={32} color={colors.patient.primary} /><Text style={styles.name}>{label}</Text></View>;
  return <ConsultationCall key={appointmentId} theme="patient" name={name} initialChat={initialChat}
    remoteVideo={remote && isTrackReference(remote) && !remote.publication.isMuted ? <VideoTrack trackRef={remote} style={StyleSheet.absoluteFill} /> : fallback(name)}
    localVideo={local && isTrackReference(local) && isCameraEnabled ? <VideoTrack trackRef={local} mirror={front.current} zOrder={1} style={StyleSheet.absoluteFill} /> : fallback("Camera off")}
    cameraEnabled={isCameraEnabled} microphoneEnabled={isMicrophoneEnabled} connected={connection === ConnectionState.Connected} chatAllowed={active} deviceBusy={deviceBusy} sending={sending}
    messages={messages.data} identityId={profile?.identity_id} onSend={send}
    onCamera={() => void device(() => room.localParticipant.setCameraEnabled(!room.localParticipant.isCameraEnabled), "Could not change your camera")}
    onMicrophone={() => void device(() => room.localParticipant.setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled), "Could not change your microphone")}
    onFlipCamera={() => void flip()} onEnd={() => { void room.disconnect().then(onEnd).catch(() => onEnd()); }} onBack={onBack} />;
}
const styles = StyleSheet.create({ placeholder: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8, backgroundColor: colors.patient.surface }, name: { color: colors.patient.text, fontFamily: fontFamilies.medium, fontSize: 13, textAlign: "center" } });
