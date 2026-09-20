import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Send, Check } from "lucide-react-native";
import { fontFamilies } from "@startup/design-tokens";
import {
  Choice,
  DoctorHeader,
  IconButton,
  Label,
  MissingPatient,
  palette,
  ui,
} from "../../../components/DoctorScreen";
import { useVisit } from "../utils/consultation";
import { useDoctorStore } from "../../../stores/useDoctorStore";
const homeThread = [
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
export function ChatScreen() {
  const { patient, appointment } = useVisit();
  const messages = useDoctorStore((s) => s.messages);
  const sendMessage = useDoctorStore((s) => s.sendMessage);
  const [draft, setDraft] = useState("");
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  if (!patient || !appointment) return <MissingPatient />;
  const thread = [
    ...(appointment.mode === "home"
      ? homeThread
      : [
          {
            id: "hello",
            text: "Hello doctor, I am ready for my consultation.",
            sent: false,
            time: "9:42 AM",
          },
        ]),
    ...(messages[appointment.id] ?? []),
  ];
  const send = () => {
    if (!draft.trim()) return;
    sendMessage(appointment.id, draft.trim());
    setDraft("");
  };
  return (
    <KeyboardAvoidingView
      style={ui.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <DoctorHeader
        title={patient.name}
        subtitle="Demo chat · Messages stay on this device"
      />
      <ScrollView
        ref={scroll}
        contentContainerStyle={{ padding: 16, gap: 16, flexGrow: 1 }}
        onContentSizeChange={() =>
          scroll.current?.scrollToEnd({ animated: false })
        }
      >
        <Label
          muted
          style={{ textAlign: "center", fontSize: 11, marginBottom: 8 }}
        >
          TODAY ·{" "}
          {appointment.mode === "home" ? "HOME VISIT" : "ONLINE CONSULTATION"}
        </Label>
        {thread.map((message) => (
          <View
            key={message.id}
            style={{
              alignSelf: message.sent ? "flex-end" : "flex-start",
              maxWidth: "82%",
              padding: 12,
              borderRadius: 12,
              borderBottomRightRadius: message.sent ? 4 : 12,
              borderBottomLeftRadius: message.sent ? 12 : 4,
              gap: 4,
              backgroundColor: message.sent ? "white" : "#EAF8F7",
              borderWidth: message.sent ? 1 : 0,
              borderColor: "#E5EFF0",
            }}
          >
            <Label style={{ color: "#173B4A" }}>{message.text}</Label>
            <View style={{ ...ui.row, justifyContent: "flex-end", gap: 3 }}>
              <Label muted style={{ fontSize: 10 }}>
                {message.time}
              </Label>
              {message.sent && <Check size={12} color={palette.muted} />}
            </View>
          </View>
        ))}
      </ScrollView>
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
          {(appointment.mode === "home"
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
        <View style={ui.row}>
          <TextInput
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
            label="Send demo message"
            disabled={!draft.trim()}
            onPress={send}
            style={{ backgroundColor: "#36B37E", width: 48, height: 48 }}
          >
            <Send size={20} color="white" />
          </IconButton>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
