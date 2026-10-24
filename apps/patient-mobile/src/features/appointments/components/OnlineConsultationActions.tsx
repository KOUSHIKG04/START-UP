import type { OnlineConsultationActionsProps } from "../types/booking-status";
import { styles } from "./BookingStatus.styles";

import { AppText as Text } from "@startup/mobile-ui";
import { Pressable, View } from "react-native";
import { MessageCircle, Video } from "lucide-react-native";
import { colors } from "@startup/design-tokens";
import { Button } from "@startup/mobile-ui";

export function OnlineConsultationActions({
  onChatPress,
  onJoinPress,
}: OnlineConsultationActionsProps) {
  return (
    <View style={styles.videoBanner}>
      <View style={styles.videoIcon}>
        <Video color={colors.patient.primaryDark} size={19} strokeWidth={2} />
      </View>
      <Text variant="cardHeading" style={styles.videoTitle}>
        Video consultation
      </Text>
      <Pressable
        accessibilityLabel="Open consultation chat"
        accessibilityRole="button"
        onPress={onChatPress}
        style={({ pressed }) => [
          styles.chatButton,
          pressed ? styles.pressed : undefined,
        ]}
      >
        <MessageCircle
          color={colors.patient.primaryDark}
          size={19}
          strokeWidth={2}
        />
      </Pressable>
      <Button
        label="Join"
        onPress={onJoinPress}
        style={styles.joinButton}
        labelStyle={styles.joinLabel}
      />
    </View>
  );
}
