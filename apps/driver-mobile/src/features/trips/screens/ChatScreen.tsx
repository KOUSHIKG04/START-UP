import { quickReplies } from "../utils/chatConstants";
import { ChatHeader } from "../components/ChatHeader";
import { DriverMessageBubble } from "../components/DriverMessageBubble";
import { styles } from "../components/TripChat.styles";
import { useDriverChat } from "../hooks/useDriverChat";

import type { DriverMessage } from "../types/chat-screen";
export type { DriverMessage } from "../types/chat-screen";
import { Input } from "@startup/mobile-ui";
import { useCallback } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { router } from "expo-router";
import { Send } from "lucide-react-native";

import { Copy, PageHeader } from "../../../components/DriverUI";
import { palette, ui } from "../../../components/theme";

export function ChatScreen() {
  const {
    messages,
    send,
    active,
    draft,
    setDraft,
    flatListRef,
    insets,
    submit,
  } = useDriverChat();
  const renderItem = useCallback(
    ({ item }: { item: DriverMessage }) => (
      <DriverMessageBubble message={item} />
    ),
    []
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={ui.screen}
    >
      <PageHeader title="Rajesh Kumar" onBack={() => router.back()} />
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        ListHeaderComponent={<ChatHeader />}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />
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
              {quickReplies.map((text) => (
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
              ))}
            </ScrollView>
            <View style={ui.row}>
              <Input
                variant="unstyled"
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
