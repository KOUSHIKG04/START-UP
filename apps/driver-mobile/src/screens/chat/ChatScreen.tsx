import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { CheckCheck, Send } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fontFamilies } from "@startup/design-tokens";
import { Copy, PageHeader, palette, ui } from "../../components/DriverUI";
import { useDriver } from "../../store/driver";
export function ChatScreen() {
  const messages = useDriver((s) => s.messages);
  const send = useDriver((s) => s.send);
  const stage = useDriver((s) => s.stage);
  const active = ["pickup", "arrived", "progress"].includes(stage);
  const [draft, setDraft] = useState("");
  const scroll = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const submit = (text: string) => {
    if (text.trim() && active) {
      send(text);
      setDraft("");
    }
  };
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={ui.screen}
    >
      <PageHeader
        title="Rajesh Kumar"
        subtitle="Patient chat · local preview"
        onBack={() => router.back()}
      />
      <ScrollView
        ref={scroll}
        onContentSizeChange={() =>
          scroll.current?.scrollToEnd({ animated: true })
        }
        contentContainerStyle={styles.messages}
      >
        <Copy style={[ui.caption, { textAlign: "center", marginBottom: 4 }]}>
          TODAY · EMERGENCY REQUEST
        </Copy>
        {messages.map((m) => (
          <View
            key={m.id}
            style={[
              styles.bubble,
              m.incoming ? styles.incoming : styles.outgoing,
            ]}
          >
            <Copy>{m.text}</Copy>
            <View style={styles.time}>
              <Copy style={ui.caption}>{m.time}</Copy>
              {!m.incoming && <CheckCheck size={14} color={palette.primary} />}
            </View>
          </View>
        ))}
      </ScrollView>
      <View
        style={[
          styles.composer,
          { paddingBottom: Math.max(16, insets.bottom) },
        ]}
      >
        {active ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quick}
            >
              {["On my way", "Arriving in 5 mins", "At pickup location"].map(
                (text) => (
                  <Pressable
                    accessibilityRole="button"
                    key={text}
                    onPress={() => submit(text)}
                    style={styles.chip}
                  >
                    <Copy style={{ color: palette.primary, fontSize: 12 }}>
                      {text}
                    </Copy>
                  </Pressable>
                )
              )}
            </ScrollView>
            <View style={ui.row}>
              <TextInput
                accessibilityLabel="Message to patient"
                value={draft}
                onChangeText={setDraft}
                placeholder="Type a message..."
                placeholderTextColor={palette.muted}
                multiline
                maxLength={2000}
                style={styles.input}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send message"
                accessibilityState={{ disabled: !draft.trim() }}
                disabled={!draft.trim()}
                onPress={() => submit(draft)}
                style={[styles.send, !draft.trim() && { opacity: 0.4 }]}
              >
                <Send color="white" size={22} />
              </Pressable>
            </View>
          </>
        ) : (
          <Copy>Chat is available during an active trip.</Copy>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  messages: { padding: 16, gap: 16 },
  bubble: { maxWidth: "82%", borderRadius: 12, padding: 12, gap: 4 },
  incoming: {
    alignSelf: "flex-start",
    backgroundColor: palette.soft,
    borderBottomLeftRadius: 3,
  },
  outgoing: {
    alignSelf: "flex-end",
    borderWidth: 1,
    borderColor: palette.border,
    borderBottomRightRadius: 3,
  },
  time: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 5,
  },
  composer: { padding: 16, gap: 12 },
  quick: { gap: 8 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.border,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 24,
    fontFamily: fontFamilies.regular,
    color: palette.ink,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.green,
    alignItems: "center",
    justifyContent: "center",
  },
});
