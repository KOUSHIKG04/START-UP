import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Camera,
  CameraOff,
  ChevronLeft,
  MessageCircle,
  Mic,
  MicOff,
  PhoneOff,
  Send,
  SwitchCamera,
  X,
} from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { Input } from "../primitives/Input";
import { useToast } from "../primitives/Toast";

export type CallMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
export type ConsultationCallProps = {
  theme: "patient" | "doctor";
  name: string;
  remoteVideo: ReactNode;
  localVideo: ReactNode;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  connected: boolean;
  chatAllowed: boolean;
  deviceBusy: boolean;
  sending: boolean;
  messages?: CallMessage[];
  identityId?: string;
  initialChat?: boolean;
  onSend: (body: string) => Promise<void>;
  onCamera: () => void;
  onMicrophone: () => void;
  onFlipCamera: () => void;
  onEnd: () => void;
  onBack: () => void;
};

export function clampCallPreview(
  x: number,
  y: number,
  width: number,
  height: number,
  previewWidth: number,
  previewHeight: number
) {
  return {
    x: Math.max(8, Math.min(x, Math.max(8, width - previewWidth - 8))),
    y: Math.max(8, Math.min(y, Math.max(8, height - previewHeight - 8))),
  };
}

function FloatingVideo({
  children,
  width,
  height,
  frame,
}: {
  children: ReactNode;
  width: number;
  height: number;
  frame: { width: number; height: number };
}) {
  const position = useRef(new Animated.ValueXY({ x: 8, y: 8 })).current;
  const current = useRef({ x: 8, y: 8 });
  const origin = useRef(current.current);
  const initialized = useRef(false);
  const bounds = useRef({
    ...frame,
    previewWidth: width,
    previewHeight: height,
  });
  useEffect(() => {
    bounds.current = { ...frame, previewWidth: width, previewHeight: height };
    if (!frame.width || !frame.height) return;
    const next = initialized.current
      ? current.current
      : { x: frame.width - width - 16, y: 16 };
    current.current = clampCallPreview(
      next.x,
      next.y,
      frame.width,
      frame.height,
      width,
      height
    );
    position.setValue(current.current);
    initialized.current = true;
  }, [frame.width, frame.height, width, height, position]);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) + Math.abs(gesture.dy) > 8,
        onPanResponderGrant: () => {
          origin.current = current.current;
        },
        onPanResponderMove: (_, gesture) => {
          const b = bounds.current;
          current.current = clampCallPreview(
            origin.current.x + gesture.dx,
            origin.current.y + gesture.dy,
            b.width,
            b.height,
            b.previewWidth,
            b.previewHeight
          );
          position.setValue(current.current);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [position]
  );
  return (
    <Animated.View
      {...pan.panHandlers}
      accessibilityLabel="Video preview. Drag to reposition"
      style={[
        styles.floating,
        { width, height, transform: position.getTranslateTransform() },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function ConsultationCall(props: ConsultationCallProps) {
  const { theme, name, messages, identityId } = props;
  const palette = colors[theme];
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [chat, setChat] = useState(props.initialChat ?? false);
  const [draft, setDraft] = useState("");
  const [unread, setUnread] = useState(0);
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const seen = useRef<Set<string> | null>(null);
  const list = useRef<FlatList<CallMessage>>(null);
  useEffect(() => {
    if (!messages || !identityId) return;
    if (!seen.current) {
      seen.current = new Set(messages.map((item) => item.id));
      return;
    }
    for (const item of messages) {
      if (seen.current.has(item.id)) continue;
      seen.current.add(item.id);
      if (item.sender_id !== identityId && !chat) {
        setUnread((value) => value + 1);
        showToast({
          title: `Message from ${name}`,
          message: item.body,
          type: "info",
        });
      }
    }
    if (chat) setUnread(0);
  }, [messages, identityId, chat, name, showToast]);
  async function send() {
    if (
      !draft.trim() ||
      props.sending ||
      !props.connected ||
      !props.chatAllowed
    )
      return;
    const body = draft.trim();
    try {
      await props.onSend(body);
      setDraft((current) => (current.trim() === body ? "" : current));
    } catch {
      /* The call owner reports the API error through the existing toast. */
    }
  }
  const control = (
    label: string,
    icon: ReactNode,
    onPress: () => void,
    active = false,
    danger = false,
    disabled = false
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.control,
        {
          backgroundColor: danger
            ? colors.danger
            : active
              ? palette.primary
              : "#FFFFFF",
          borderColor: danger ? colors.danger : palette.primary,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon}
    </Pressable>
  );
  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: palette.surface }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, backgroundColor: palette.primary },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Leave call screen"
          onPress={props.onBack}
          style={styles.headerButton}
        >
          <ChevronLeft size={24} color={colors.white} />
        </Pressable>
        <View style={styles.heading}>
          <Text numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          <Text style={styles.status}>
            {props.connected
              ? chat
                ? "In-call chat"
                : "Video consultation"
              : "Connectingâ€¦"}
          </Text>
        </View>
        {chat ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close chat and return to video"
            onPress={() => setChat(false)}
            style={styles.headerButton}
          >
            <X size={22} color={colors.white} />
          </Pressable>
        ) : null}
      </View>
      <View
        style={styles.stage}
        onLayout={(event) => setFrame(event.nativeEvent.layout)}
      >
        {chat ? (
          <View style={styles.thread}>
            <FlatList
              ref={list}
              data={messages ?? []}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messages}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() =>
                list.current?.scrollToEnd({ animated: false })
              }
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.bubble,
                    item.sender_id === identityId
                      ? {
                          alignSelf: "flex-end",
                          backgroundColor: palette.surface,
                        }
                      : styles.received,
                  ]}
                >
                  <Text style={[styles.message, { color: palette.text }]}>
                    {item.body}
                  </Text>
                  <Text style={styles.time}>
                    {new Date(item.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.empty}>
                  Messages shared during this consultation appear here.
                </Text>
              }
            />
            <View style={styles.composer}>
              <Input
                accessibilityLabel="Consultation message"
                placeholder="Type a messageâ€¦"
                value={draft}
                onChangeText={setDraft}
                multiline
                maxLength={2000}
                editable={
                  props.chatAllowed && props.connected && !props.sending
                }
                containerStyle={styles.input}
                style={styles.inputText}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send message"
                disabled={
                  !draft.trim() ||
                  props.sending ||
                  !props.connected ||
                  !props.chatAllowed
                }
                onPress={() => void send()}
                style={[
                  styles.send,
                  { backgroundColor: palette.primary },
                  (!draft.trim() ||
                    props.sending ||
                    !props.connected ||
                    !props.chatAllowed) &&
                    styles.disabled,
                ]}
              >
                {props.sending ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Send size={20} color={colors.white} />
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={StyleSheet.absoluteFill}>{props.remoteVideo}</View>
        )}
        <FloatingVideo
          width={chat ? 132 : 104}
          height={chat ? 172 : 140}
          frame={frame}
        >
          <View style={styles.video}>
            {chat ? props.remoteVideo : props.localVideo}
          </View>
          {chat ? (
            <View pointerEvents="none" style={styles.tinySelf}>
              {props.localVideo}
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Flip your camera"
            disabled={
              !props.cameraEnabled || props.deviceBusy || !props.connected
            }
            onPress={props.onFlipCamera}
            style={[
              styles.flip,
              (!props.cameraEnabled || props.deviceBusy) && styles.disabled,
            ]}
          >
            <SwitchCamera size={18} color={colors.white} />
          </Pressable>
        </FloatingVideo>
      </View>
      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        <View style={styles.controls}>
          {control(
            props.cameraEnabled ? "Turn camera off" : "Turn camera on",
            props.cameraEnabled ? (
              <Camera size={23} color={palette.primary} />
            ) : (
              <CameraOff size={23} color={colors.white} />
            ),
            props.onCamera,
            !props.cameraEnabled,
            false,
            props.deviceBusy || !props.connected
          )}
          {control(
            props.microphoneEnabled ? "Mute microphone" : "Unmute microphone",
            props.microphoneEnabled ? (
              <Mic size={23} color={palette.primary} />
            ) : (
              <MicOff size={23} color={colors.white} />
            ),
            props.onMicrophone,
            !props.microphoneEnabled,
            false,
            props.deviceBusy || !props.connected
          )}
          {control(
            chat ? "Close consultation chat" : "Open consultation chat",
            <View>
              <MessageCircle
                size={23}
                color={chat ? colors.white : palette.primary}
              />
              {!chat && unread > 0 ? (
                <View
                  style={[styles.badge, { backgroundColor: palette.primary }]}
                >
                  <Text style={styles.badgeText}>
                    {unread > 9 ? "9+" : unread}
                  </Text>
                </View>
              ) : null}
            </View>,
            () => {
              setChat((value) => !value);
              setUnread(0);
            },
            chat
          )}
          {control(
            "End call",
            <PhoneOff size={23} color={colors.white} />,
            props.onEnd,
            false,
            true
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  headerButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: { flex: 1, minWidth: 0 },
  name: {
    color: colors.white,
    fontFamily: fontFamilies.semibold,
    fontSize: 17,
  },
  status: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    marginTop: 3,
  },
  stage: { flex: 1, overflow: "hidden" },
  thread: { flex: 1, backgroundColor: colors.white },
  messages: { flexGrow: 1, padding: 16, paddingTop: 190, gap: 12 },
  bubble: { maxWidth: "84%", borderRadius: 14, padding: 12, gap: 5 },
  received: { alignSelf: "flex-start", backgroundColor: "#F0F2F5" },
  message: { fontFamily: fontFamilies.regular, fontSize: 15, lineHeight: 21 },
  time: {
    alignSelf: "flex-end",
    color: "#59636D",
    fontFamily: fontFamilies.regular,
    fontSize: 11,
  },
  empty: {
    color: "#59636D",
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 24,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    gap: 10,
  },
  input: { flex: 1 },
  inputText: { minHeight: 48, maxHeight: 100 },
  send: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  floating: {
    position: "absolute",
    top: 0,
    left: 0,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#173B4A",
    elevation: 5,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  video: { flex: 1 },
  tinySelf: {
    position: "absolute",
    width: 42,
    height: 56,
    left: 6,
    bottom: 6,
    borderRadius: 8,
    overflow: "hidden",
  },
  flip: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00000080",
  },
  footer: {
    paddingTop: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.white,
  },
  controls: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  control: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.45 },
  badge: {
    position: "absolute",
    right: -10,
    top: -9,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontFamily: fontFamilies.semibold,
  },
});
