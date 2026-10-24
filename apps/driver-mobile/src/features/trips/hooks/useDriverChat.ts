import type { DriverMessage } from "../types/chat-screen";
import { useRef, useState } from "react";
import { FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDriver } from "../../../stores/driver";

export function useDriverChat() {
  const messages = useDriver((s) => s.messages);
  const send = useDriver((s) => s.send);
  const stage = useDriver((s) => s.stage);
  const active = ["pickup", "arrived", "progress"].includes(stage);
  const [draft, setDraft] = useState("");
  const flatListRef = useRef<FlatList<DriverMessage>>(null);
  const insets = useSafeAreaInsets();
  const submit = (text: string) => {
    if (text.trim() && active) {
      send(text);
      setDraft("");
    }
  };

  return {
    messages,
    send,
    active,
    draft,
    setDraft,
    flatListRef,
    insets,
    submit,
  };
}
