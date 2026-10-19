import { AppText as Text } from "../primitives/AppText";
import { useMobileTheme } from "../theme/MobileThemeProvider";
import type { SectionHeaderProps } from "../types/sectionHeader";
export type { SectionHeaderProps } from "../types/sectionHeader";
import { Pressable, StyleSheet, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { fontFamilies } from "@startup/design-tokens";

export function SectionHeader({
  theme,
  title,
  seeAllText,
  onSeeAllPress,
  showSeeAll = true,
  style,
  titleStyle,
  seeAllTextStyle,
}: SectionHeaderProps) {
  const palette = useMobileTheme(theme);
  return (
    <View style={[styles.container, style]}>
      <Text
        variant="sectionHeading"
        style={[styles.title, { color: palette.text }, titleStyle]}
      >
        {title}
      </Text>

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
          <Text
            variant="label"
            style={[
              styles.seeAllText,
              { color: palette.primaryText },
              seeAllTextStyle,
            ]}
          >
            {seeAllText}
          </Text>
          <ChevronRight
            color={palette.primaryText}
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
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
});
