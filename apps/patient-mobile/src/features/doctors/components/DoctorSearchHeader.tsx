import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";
import { ChevronLeft, Mic } from "lucide-react-native";
import {
  colors,
  fontFamilies,
  gradients,
  shadows,
  spacing,
} from "@startup/design-tokens";
import { SafeAreaView, SearchInput } from "@startup/mobile-ui";

type DoctorSearchHeaderProps = {
  onBackPress: () => void;
  onSearchFocus: () => void;
};

export function DoctorSearchHeader({
  onBackPress,
  onSearchFocus,
}: DoctorSearchHeaderProps) {
  return (
    <LinearGradient
      colors={gradients.patientBanner.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <SafeAreaView edges={["top"]}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onBackPress}
            style={({ pressed }) => [
              styles.backButton,
              pressed ? styles.backButtonPressed : undefined,
            ]}
          >
            <ChevronLeft color={colors.white} size={30} strokeWidth={2.5} />
          </Pressable>

          <SearchInput
            accessibilityLabel="Describe what you're feeling"
            containerStyle={styles.headerSearch}
            iconSize={18}
            inputStyle={styles.searchInput}
            onFocus={onSearchFocus}
            placeholder="Describe what you're feeling..."
            placeholderTextColor={colors.patient.muted}
            rightAccessory={
              <Mic
                color={colors.patient.primaryDark}
                size={19}
                strokeWidth={2}
              />
            }
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    width: 32,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  headerSearch: {
    maxWidth: 420,
    height: 48,
    flex: 1,
    borderWidth: 0,
    borderRadius: 24,
    ...shadows.card,
  },
  searchInput: {
    color: colors.patient.text,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
  },
});
