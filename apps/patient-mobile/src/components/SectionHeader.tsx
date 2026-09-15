import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { ChevronRight } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";

export interface SectionHeaderProps {
  title?: string;
  seeAllText?: string;
  onSeeAllPress?: () => void;
  showSeeAll?: boolean;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  seeAllTextStyle?: StyleProp<TextStyle>;
}

export default function SectionHeader({
  title,
  seeAllText,
  onSeeAllPress,
  showSeeAll = true,
  style,
  titleStyle,
  seeAllTextStyle,
}: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, titleStyle]}>{title}</Text>

      {showSeeAll && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${seeAllText} ${title}`}
          hitSlop={8}
          onPress={onSeeAllPress}
          style={({ pressed }) => [
            styles.seeAllButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.seeAllText, seeAllTextStyle]}>{seeAllText}</Text>
          <ChevronRight
            color={colors.patient.primaryDark}
            size={16}
            strokeWidth={2.2}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  title: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  seeAllText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
});
