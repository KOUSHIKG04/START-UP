import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { AudioSession, LiveKitRoom, VideoTrack, isTrackReference, registerGlobals, useRoomContext, useTracks } from "@livekit/react-native";
import { Track, type LocalVideoTrack } from "livekit-client";
import { uuidSchema } from "@startup/contracts";
import { getOnlineJoinContext, getOnlineVideoToken, listOnlineMessages, sendOnlineMessage, subscribeOnlineMessages } from "@startup/data-access";
import { supabase, useMobileSession } from "../../../services/supabase";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Camera,
  CheckCheck,
  ChevronLeft,
  Mic,
  Paperclip,
  Phone,
  PhoneOff,
  Send,
  Smile,
  SwitchCamera,
  UserRound,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import { FadedScrollView, Input, SafeAreaView, useToast, useToastFeedback } from "@startup/mobile-ui";
import type { Appointment } from "../../appointments/types/appointment";

registerGlobals();

export interface OnlineVisitFlowProps {
  appointment: Appointment;
  initialChat: boolean;
  onBackPress: () => void;
  onComplete: () => void;
}

export function OnlineVisitFlow({
  appointment,
  initialChat,
  onBackPress,
}: OnlineVisitFlowProps) {
  const [showChat, setShowChat] = useState(initialChat);
  const [message, setMessage] = useState("");
  const [sendError, setSendError] = useState("");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const appointmentId = appointment.backendId;
  const live = uuidSchema.safeParse(appointmentId).success;
  const { profile } = useMobileSession();
  const queryClient = useQueryClient();
  const context = useQuery({ queryKey: ["online-context", appointmentId],
    queryFn: () => getOnlineJoinContext(supabase!, appointmentId!), enabled: Boolean(live && supabase) });
  const messages = useQuery({ queryKey: ["online-messages", appointmentId],
    queryFn: () => listOnlineMessages(supabase!, appointmentId!), enabled: Boolean(context.data && supabase) });
  const token = useQuery({ queryKey: ["online-video-token", appointmentId],
    queryFn: () => getOnlineVideoToken(supabase!, appointmentId!), enabled: Boolean(!showChat && context.data && supabase), staleTime: 5 * 60 * 1000 });
  useToastFeedback({ error: sendError || (messages.isError ? "Could not load messages." : "") });
  useEffect(() => {
    if (!context.data || !supabase || !appointmentId) return;
    return subscribeOnlineMessages(supabase, appointmentId, () => {
      void queryClient.invalidateQueries({ queryKey: ["online-messages", appointmentId] });
    });
  }, [context.data?.appointment_id, appointmentId, queryClient]);
  useEffect(() => {
    if (showChat || !token.data) return;
    void AudioSession.startAudioSession();
    return () => { void AudioSession.stopAudioSession(); };
  }, [showChat, token.data]);

  const sendMessage = async () => {
    const nextMessage = message.trim();
    if (!nextMessage || !appointmentId || !supabase || !context.data) return;
    try { await sendOnlineMessage(supabase, appointmentId, nextMessage, Crypto.randomUUID());
      setMessage(""); setSendError(""); await queryClient.invalidateQueries({ queryKey: ["online-messages", appointmentId] }); }
    catch (cause) { setSendError(cause instanceof Error ? cause.message : "Could not send message."); }
  };

  if (!live) return <View style={styles.videoCallScreen}><Text>This appointment is not linked to a live online consultation.</Text></View>;
  if (context.isLoading) return <View style={styles.videoCallScreen}><Text>Loading consultation…</Text></View>;
  if (!context.data) return <View style={styles.videoCallScreen}><Text>Consultation is available after confirmation, near its scheduled time.</Text></View>;

  if (!showChat) {
    if (token.isLoading) return <View style={styles.videoCallScreen}><Text>Connecting video…</Text></View>;
    if (!token.data) return <View style={styles.videoCallScreen}><Text>{token.error instanceof Error ? token.error.message : "Video service is unavailable."}</Text></View>;
    return (
      <LiveKitRoom serverUrl={token.data.serverUrl} token={token.data.participantToken} connect audio video>
      <VideoCallView
        appointment={appointment}
        cameraOff={cameraOff}
        muted={muted}
        onBackPress={onBackPress}
        onEnd={onBackPress}
        onCameraChange={setCameraOff}
        onMuteChange={setMuted}
      />
      </LiveKitRoom>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.chatScreen}
    >
      <LinearGradient
        colors={["#0A4A47", "#087F78"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.chatHeader}
      >
        <SafeAreaView edges={["top"]} style={styles.chatHeaderSafeArea}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onBackPress}
            style={styles.headerIconButton}
          >
            <ChevronLeft color={colors.white} size={28} />
          </Pressable>
          <Text numberOfLines={1} style={styles.chatHeaderTitle}>
            {appointment.doctorName}
          </Text>
          <Pressable
            accessibilityLabel="Start video consultation"
            accessibilityRole="button"
            onPress={() => setShowChat(false)}
            style={styles.callTrigger}
          >
            <Phone color={colors.patient.primaryDark} size={19} fill={colors.patient.primaryDark} />
          </Pressable>
        </SafeAreaView>
      </LinearGradient>

      <FadedScrollView
        contentContainerStyle={styles.chatThread}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.chatDay}>TODAY · SECURE CONSULTATION</Text>
        {messages.isLoading ? <Text>Loading messages…</Text> : null}
        {(messages.data ?? []).map((item) => (
          <ChatBubble key={item.id} received={item.sender_id !== profile?.identity_id}
            text={item.body} time={new Date(item.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} />
        ))}
      </FadedScrollView>

      <View style={styles.chatInputArea}>
        <View style={styles.quickReplies}>
          {["Feeling better", "Still unwell", "Start video call"].map((reply) => (
            <Pressable
              key={reply}
              onPress={() => (reply === "Start video call" ? setShowChat(false) : setMessage(reply))}
              style={styles.quickReply}
            >
              <Text style={styles.quickReplyText}>{reply}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.composerRow}>
          <View style={styles.composerField}>
            <Paperclip color={colors.patient.textSecondary} size={18} />
            <Input
              accessibilityLabel="Chat message"
              containerStyle={styles.composerInputContainer}
              placeholder="Type a message..."
              value={message}
              onChangeText={setMessage}
              style={styles.composerInput}
            />
            <Mic color={colors.patient.textSecondary} size={19} />
            <Smile color={colors.patient.textSecondary} size={19} />
          </View>
          <Pressable
            accessibilityLabel="Send message"
            accessibilityRole="button"
            disabled={!message.trim()}
            onPress={() => void sendMessage()}
            style={({ pressed }) => [
              styles.sendTrigger,
              !message.trim() ? styles.sendDisabled : undefined,
              pressed ? styles.pressed : undefined,
            ]}
          >
            <Send color={colors.white} size={20} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function ChatBubble({ received = false, text, time }: { received?: boolean; text: string; time: string }) {
  return (
    <View style={[styles.chatBubbleRow, received ? styles.receivedRow : styles.sentRow]}>
      <View style={[styles.chatBubble, received ? styles.receivedBubble : styles.sentBubble]}>
        <Text style={styles.chatMessage}>{text}</Text>
        <View style={styles.chatMessageMeta}>
          <Text style={styles.chatTime}>{time}</Text>
          {!received ? <CheckCheck color={colors.patient.accent} size={14} /> : null}
        </View>
      </View>
    </View>
  );
}

function VideoCallView({
  appointment,
  cameraOff,
  muted,
  onBackPress,
  onEnd,
  onCameraChange,
  onMuteChange,
}: {
  appointment: Appointment;
  cameraOff: boolean;
  muted: boolean;
  onBackPress: () => void;
  onEnd: () => void;
  onCameraChange: (off: boolean) => void;
  onMuteChange: (muted: boolean) => void;
}) {
  const room = useRoomContext();
  const { showToast } = useToast();
  const [frontCamera, setFrontCamera] = useState(true);
  const [switchingCamera, setSwitchingCamera] = useState(false);
  const tracks = useTracks([Track.Source.Camera]);
  const remote = tracks.find((track) => isTrackReference(track) && !track.participant.isLocal);
  const local = tracks.find((track) => isTrackReference(track) && track.participant.isLocal);
  const changeCamera = async () => {
    const next = !cameraOff;
    await room.localParticipant.setCameraEnabled(!next);
    onCameraChange(next);
  };
  const flipCamera = async () => {
    if (cameraOff || switchingCamera) return;
    const track = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track as LocalVideoTrack | undefined;
    if (!track) {
      showToast({ title: "Camera unavailable", message: "Turn on your camera before switching it.", type: "error" });
      return;
    }
    setSwitchingCamera(true);
    try {
      await track.mediaStreamTrack.applyConstraints({ facingMode: frontCamera ? "environment" : "user" });
      setFrontCamera(!frontCamera);
    } catch {
      showToast({ title: "Could not switch camera", message: "Check that this device has another camera and try again.", type: "error" });
    } finally {
      setSwitchingCamera(false);
    }
  };
  const changeMute = async () => {
    const next = !muted;
    await room.localParticipant.setMicrophoneEnabled(!next);
    onMuteChange(next);
  };
  return (
    <View style={styles.videoCallScreen}>
      <SafeAreaView edges={["top"]} style={styles.videoSafeArea}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={onBackPress}
          style={styles.videoBackButton}
        >
          <ChevronLeft color={colors.patient.primaryDark} size={28} />
        </Pressable>
        <View style={styles.remoteVideoPlaceholder}>
          {remote && isTrackReference(remote) ? <VideoTrack trackRef={remote} style={StyleSheet.absoluteFill} /> : <>
            <UserRound color={colors.patient.primary} size={38} strokeWidth={1.6} />
            <Text style={styles.videoDoctorName}>{appointment.doctorName}</Text>
          </>}
        </View>
        <View style={styles.localVideoPreview}>
          {local && isTrackReference(local) && !cameraOff ? <VideoTrack trackRef={local} style={StyleSheet.absoluteFill} /> : <UserRound color={colors.white} size={29} />}
        </View>
        <View style={styles.videoControls}>
          <VideoControl accessibilityLabel={cameraOff ? "Turn camera on" : "Turn camera off"} onPress={() => void changeCamera()}>
            <Camera color={colors.white} size={25} />
          </VideoControl>
          <VideoControl accessibilityLabel={frontCamera ? "Switch to back camera" : "Switch to front camera"} disabled={cameraOff || switchingCamera || !local} onPress={() => void flipCamera()}>
            <SwitchCamera color={colors.white} size={25} />
          </VideoControl>
          <VideoControl accessibilityLabel={muted ? "Unmute" : "Mute"} onPress={() => void changeMute()}>
            <Mic color={colors.white} size={27} />
          </VideoControl>
          <VideoControl accessibilityLabel="End consultation" danger onPress={onEnd}>
            <PhoneOff color={colors.white} size={25} fill={colors.white} />
          </VideoControl>
        </View>
      </SafeAreaView>
    </View>
  );
}

function VideoControl({
  accessibilityLabel,
  children,
  danger = false,
  disabled = false,
  onPress,
}: {
  accessibilityLabel: string;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.videoControl,
        danger ? styles.videoEndControl : undefined,
        disabled ? { opacity: 0.5 } : undefined,
        pressed ? styles.pressed : undefined,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chatScreen: { flex: 1, backgroundColor: colors.white },
  chatHeader: { minHeight: 106 },
  chatHeaderSafeArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  chatHeaderTitle: {
    flex: 1,
    color: colors.white,
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
    fontWeight: "600",
  },
  callTrigger: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: colors.white,
  },
  chatThread: { gap: 16, padding: 16, paddingBottom: 26 },
  chatDay: {
    marginVertical: 4,
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.semibold,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  chatBubbleRow: { width: "100%", flexDirection: "row" },
  receivedRow: { justifyContent: "flex-start" },
  sentRow: { justifyContent: "flex-end" },
  chatBubble: { maxWidth: "78%", gap: 4, padding: 12 },
  receivedBubble: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderBottomLeftRadius: 4,
    backgroundColor: "#EAF8F7",
  },
  sentBubble: {
    borderWidth: 1,
    borderColor: "#E5EFF0",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 4,
    backgroundColor: colors.white,
  },
  chatMessage: {
    color: "#173B4A",
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 19,
  },
  chatMessageMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  chatTime: {
    color: "#71818F",
    fontFamily: fontFamilies.regular,
    fontSize: 10,
  },
  chatInputArea: {
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: colors.white,
  },
  quickReplies: { flexDirection: "row", gap: 7 },
  quickReply: {
    flex: 1,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: "#E5EFF0",
    borderRadius: 17,
    backgroundColor: colors.white,
  },
  quickReplyText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  composerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  composerField: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5EFF0",
    borderRadius: 24,
    backgroundColor: colors.white,
  },
  composerInputContainer: { flex: 1, maxWidth: undefined },
  composerInput: {
    minHeight: 44,
    paddingHorizontal: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  sendTrigger: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "#36B37E",
  },
  sendDisabled: { opacity: 0.45 },
  pressed: { opacity: 0.72 },
  videoCallScreen: { flex: 1, backgroundColor: "#C8EDE9" },
  videoSafeArea: { flex: 1 },
  videoBackButton: {
    position: "absolute",
    top: 12,
    left: 16,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  remoteVideoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  videoDoctorName: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
    fontWeight: "600",
  },
  localVideoPreview: {
    position: "absolute",
    right: 30,
    bottom: 150,
    width: 101,
    height: 131,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 26,
    backgroundColor: colors.patient.accent,
  },
  videoControls: {
    position: "absolute",
    left: 38,
    right: 38,
    bottom: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  videoControl: {
    width: 58,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: colors.patient.primaryDark,
  },
  videoEndControl: {
    backgroundColor: colors.danger,
  },
});
