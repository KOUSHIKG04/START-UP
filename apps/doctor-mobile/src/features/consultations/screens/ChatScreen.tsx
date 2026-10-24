import { LegacyChatScreen } from "../components/LegacyChatScreen";

export type { MessageItem } from "../types/chat-screen";

import { uuidSchema } from "@startup/contracts";
import { OnlineConsultationScreen } from "./OnlineConsultationScreen";

import { useLocalSearchParams } from "expo-router";

export function ChatScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  return uuidSchema.safeParse(appointmentId).success ? (
    <OnlineConsultationScreen initialChat />
  ) : (
    <LegacyChatScreen />
  );
}
