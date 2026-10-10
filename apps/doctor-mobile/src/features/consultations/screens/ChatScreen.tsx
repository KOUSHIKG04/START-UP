import { uuidSchema } from "@startup/contracts";
import { OnlineConsultationScreen } from "./OnlineConsultationScreen";
import { Input } from "@startup/mobile-ui";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import * as Crypto from "expo-crypto";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listOnlineMessages, sendOnlineMessage, subscribeOnlineMessages } from "@startup/data-access";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Send, Check } from "lucide-react-native";
import { fontFamilies } from "@startup/design-tokens";
import { Loader } from "@startup/mobile-ui";
import {
  Choice,
  DoctorHeader,
  IconButton,
  Label,
  MissingPatient,
} from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";
import { useVisit } from "../utils/consultation";
import { useDoctorStore } from "../../../stores/useDoctorStore";
import { supabase, useMobileSession } from "../../../services/supabase";
import { useOnlineVisit } from "../utils/useOnlineVisit";

interface MessageItem {
  id: string;
  sent: boolean;
  text: string;
  time: string;
}

const ChatMessageItem = memo(function ChatMessageItem({ message }: { message: MessageItem }) {
  return (
    <View
      style={[
        styles.messageContainer,
        message.sent ? styles.sentContainer : styles.receivedContainer,
      ]}
    >
      <Label style={styles.messageText}>{message.text}</Label>
      <View style={styles.metaRow}>
        <Label muted style={styles.metaTime}>
          {message.time}
        </Label>
        {message.sent && <Check size={12} color={palette.muted} />}
      </View>
    </View>
  );
});

const homeThread: MessageItem[] = [
  {
    id: "1",
    sent: false,
    text: "Are you close? The patient is having severe breathing difficulty and we are ready at the door.",
    time: "9:42 AM",
  },
  {
    id: "2",
    sent: true,
    text: "Yes, I am on my way. Passing through Sriramapura main road now. The traffic is a bit heavy but we are moving fast.",
    time: "9:43 AM",
  },
  {
    id: "3",
    sent: true,
    text: "Estimated arrival is in 7 minutes. Please keep the main gate clear.",
    time: "9:43 AM",
  },
  {
    id: "4",
    sent: false,
    text: "Understood. The gate is open and the stretcher path is clear. Thank you.",
    time: "9:44 AM",
  },
];
const ChatHeader = memo(function ChatHeader({ mode }: { mode?: string }) {
  return (
    <Label muted style={styles.headerLabel}>
      TODAY Â· {mode === "home" ? "HOME VISIT" : "ONLINE CONSULTATION"}
    </Label>
  );
});

export function ChatScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  return uuidSchema.safeParse(appointmentId).success ? <OnlineConsultationScreen initialChat /> : <LegacyChatScreen />;
}
function LegacyChatScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const live = useOnlineVisit(appointmentId);
  const { profile } = useMobileSession();
  const queryClient = useQueryClient();
  const [sendError, setSendError] = useState("");
  const liveMessages = useQuery({
    queryKey: ["online-messages", appointmentId],
    queryFn: () => listOnlineMessages(supabase!, appointmentId!),
    enabled: Boolean(live.appointment && supabase),
  });
  useEffect(() => {
    if (!live.appointment || !supabase || !appointmentId) return;
    return subscribeOnlineMessages(supabase, appointmentId, () => {
      void queryClient.invalidateQueries({ queryKey: ["online-messages", appointmentId] });
    });
  }, [live.appointment?.id, appointmentId, queryClient]);
  const { patient, appointment } = useVisit();
  const messages = useDoctorStore((s) => s.messages);
  const sendMessage = useDoctorStore((s) => s.sendMessage);
  const [draft, setDraft] = useState("");
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<MessageItem>>(null);
  const renderItem = useCallback(
    ({ item }: { item: MessageItem }) => <ChatMessageItem message={item} />,
    [],
  );

  if (live.isLive && live.loading) return <Loader theme="doctor" size="large" style={{ flex: 1 }} />;
  if (live.isLive && !live.appointment) return <MissingPatient />;
  if (!live.isLive && (!patient || !appointment)) return <MissingPatient />;
  const demoThread: MessageItem[] = [
    ...(appointment?.mode === "home"
      ? homeThread
      : [
          {
            id: "hello",
            text: "Hello doctor, I am ready for my consultation.",
            sent: false,
            time: "9:42 AM",
          },
        ]),
    ...(messages[appointment?.id ?? ""] ?? []),
  ];
  const thread: MessageItem[] = live.appointment
    ? (liveMessages.data ?? []).map(item => ({ id: item.id, sent: item.sender_id === profile?.identity_id,
      text: item.body, time: new Date(item.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) }))
    : demoThread;
  const send = async () => {
    if (!draft.trim()) return;
    if (live.appointment && supabase) {
      try {
        await sendOnlineMessage(supabase, live.appointment.id, draft, Crypto.randomUUID());
        setDraft(""); setSendError("");
        await queryClient.invalidateQueries({ queryKey: ["online-messages", appointmentId] });
      } catch (cause) { setSendError(cause instanceof Error ? cause.message : "Message could not be sent."); }
    } else if (appointment) { sendMessage(appointment.id, draft.trim()); setDraft(""); }
  };

  return (
    <KeyboardAvoidingView
      style={ui.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <DoctorHeader
        title={live.appointment?.patient_name ?? patient?.name ?? "Patient"}
      />
      <FlatList
        ref={flatListRef}
        data={thread}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={<ChatHeader mode={live.appointment ? "online" : appointment?.mode} />}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
      />
      <View
        style={{
          padding: 16,
          paddingBottom: Math.max(16, insets.bottom),
          gap: 12,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {(appointment?.mode === "home"
            ? ["On my way", "Arriving in 5 mins", "At pickup location"]
            : ["Hello, how are you?", "Please share your symptoms", "Thank you"]
          ).map((text) => (
            <Choice
              key={text}
              label={text}
              selected={false}
              onPress={() => setDraft(text)}
            />
          ))}
        </ScrollView>
        {sendError ? <Label style={ui.error}>{sendError}</Label> : null}
        <View style={ui.row}>
          <Input variant="unstyled"
            accessibilityLabel="Message"
            placeholder="Type a message..."
            placeholderTextColor={palette.muted}
            multiline
            maxLength={2000}
            value={draft}
            onChangeText={setDraft}
            style={{
              flex: 1,
              maxHeight: 120,
              minHeight: 48,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: palette.border,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontFamily: fontFamilies.regular,
              color: palette.text,
              fontSize: 14,
            }}
          />
          <IconButton
            label={live.appointment ? "Send message" : "Send demo message"}
            disabled={!draft.trim()}
            onPress={() => void send()}
            style={{ backgroundColor: "#36B37E", width: 48, height: 48 }}
          >
            <Send size={20} color="white" />
          </IconButton>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    gap: 16,
    flexGrow: 1,
  },
  headerLabel: {
    textAlign: "center",
    fontSize: 11,
    marginBottom: 8,
  },
  messageContainer: {
    maxWidth: "82%",
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  sentContainer: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 12,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5EFF0",
  },
  receivedContainer: {
    alignSelf: "flex-start",
    borderBottomRightRadius: 12,
    borderBottomLeftRadius: 4,
    backgroundColor: "#EAF8F7",
    borderWidth: 0,
  },
  messageText: {
    color: "#173B4A",
  },
  metaRow: {
    ...ui.row,
    justifyContent: "flex-end",
    gap: 3,
  },
  metaTime: {
    fontSize: 10,
  },
});
