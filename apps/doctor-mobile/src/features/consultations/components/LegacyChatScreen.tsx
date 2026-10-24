import { ChatMessageItem } from "./ChatMessageItem";
import { ChatHeader } from "./ChatHeader";

import { styles } from "./ConsultationChat.styles";
import { useLegacyConsultationChat } from "../hooks/useLegacyConsultationChat";
import { homeThread } from "../utils/chatConstants";
import type { MessageItem } from "../types/chat-screen";
import { Input } from "@startup/mobile-ui";
import { useCallback } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { Send } from "lucide-react-native";
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

export function LegacyChatScreen() {
  const {
    send,
    live,
    profile,
    sendError,
    liveMessages,
    patient,
    appointment,
    messages,
    draft,
    setDraft,
    insets,
    flatListRef,
  } = useLegacyConsultationChat();
  const renderItem = useCallback(
    ({ item }: { item: MessageItem }) => <ChatMessageItem message={item} />,
    []
  );

  if (live.isLive && live.loading)
    return <Loader theme="doctor" size="large" style={{ flex: 1 }} />;
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
    ? (liveMessages.data ?? []).map((item) => ({
        id: item.id,
        sent: item.sender_id === profile?.identity_id,
        text: item.body,
        time: new Date(item.created_at).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
      }))
    : demoThread;

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
        ListHeaderComponent={
          <ChatHeader mode={live.appointment ? "online" : appointment?.mode} />
        }
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
          <Input
            variant="unstyled"
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
