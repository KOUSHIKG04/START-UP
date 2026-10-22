import type { ProfileActionProps } from "../types/profile";
import { styles } from "./ProfileScreen.styles";

import { AppText as Text } from "@startup/mobile-ui";

import { Pressable, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { colors } from "@startup/design-tokens";
export function ProfileAction({
  icon,
  title,
  count,
  neutralCount = false,
  trailingIcon,
  onPress,
}: ProfileActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
    >
      <View style={styles.actionIcon}>{icon}</View>
      <View style={styles.copyCol}>
        <Text variant="body" style={styles.actionTitle}>
          {title}
        </Text>
      </View>
      {count ? (
        <View
          style={[styles.countBadge, neutralCount && styles.familyCountBadge]}
        >
          <Text
            variant="label"
            style={[styles.countLabel, neutralCount && styles.familyCountLabel]}
          >
            {count}
          </Text>
        </View>
      ) : null}
      <View style={styles.trailingIcon}>
        {trailingIcon ?? (
          <ChevronRight
            size={24}
            color={colors.patient.textSecondary}
            strokeWidth={2}
          />
        )}
      </View>
    </Pressable>
  );
}
