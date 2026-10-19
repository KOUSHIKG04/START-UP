import { styles } from "./ConsultationChat.styles";
import type { ChatMessageItemProps } from "../types/chat-message-item";
import { memo } from "react";
import { View } from "react-native";
import { Check } from "lucide-react-native";
import { Label } from "../../../components/DoctorScreen";
import { palette } from "../../../components/theme";
export const ChatMessageItem = memo(function ChatMessageItem({
  message,
}: ChatMessageItemProps) {
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
