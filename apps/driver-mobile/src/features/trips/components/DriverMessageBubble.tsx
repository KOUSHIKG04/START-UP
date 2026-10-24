import { styles } from "./TripChat.styles";
import type { DriverMessageBubbleProps } from "../types/driver-message-bubble";
import { memo } from "react";
import { View } from "react-native";
import { CheckCheck } from "lucide-react-native";
import { Copy } from "../../../components/DriverUI";
import { palette, ui } from "../../../components/theme";

export const DriverMessageBubble = memo(function DriverMessageBubble({
  message,
}: DriverMessageBubbleProps) {
  return (
    <View
      style={[
        styles.bubble,
        message.incoming ? styles.incoming : styles.outgoing,
      ]}
    >
      <Copy>{message.text}</Copy>
      <View style={styles.time}>
        <Copy style={ui.caption}>{message.time}</Copy>
        {!message.incoming && <CheckCheck size={14} color={palette.primary} />}
      </View>
    </View>
  );
});
