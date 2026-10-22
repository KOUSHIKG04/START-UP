import { Pressable, StyleSheet, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { AppText as Text } from "@startup/mobile-ui";
import { colors, fontFamilies, surfaces } from "@startup/design-tokens";

export function BookingGuideLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Learn how to book an appointment"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.helpIcon} accessible={false}>
        <Text style={styles.questionMark}>?</Text>
      </View>
      <Text style={styles.label}>Learn how to book an appointment</Text>
      <ChevronRight
        size={24}
        color={colors.patient.textSecondary}
        strokeWidth={2}
        accessible={false}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "98%",
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.white,
    ...surfaces.card,
  },
  pressed: { opacity: 0.75 },
  helpIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.patient.primary,
  },
  questionMark: {
    color: colors.white,
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    lineHeight: 30,
    textAlign: "center",
  },
  label: {
    flex: 1,
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
    lineHeight: 19,
  },
});
