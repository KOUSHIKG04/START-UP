import type { ReactNode } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { colors } from "@startup/design-tokens";

const city = require("../../../../assets/images/onboarding/city.png");

export function OnboardingShell({
  children,
  onBack,
  bottomArt = true,
  scroll = false,
}: {
  children: ReactNode;
  onBack?: () => void;
  bottomArt?: boolean;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const content = (
    <View
      style={[
        styles.content,
        {
          paddingTop: Math.max(insets.top, 22) + 18,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={styles.back}
        >
          <ArrowLeft size={24} color={colors.patient.primaryDark} />
        </Pressable>
      ) : null}
      {children}
    </View>
  );
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View pointerEvents="none" style={styles.topCrop}>
        <Image source={city} style={styles.topImage} resizeMode="stretch" />
      </View>
      {bottomArt ? (
        <View pointerEvents="none" style={styles.bottomImage}>
          <Image source={city} style={styles.fill} resizeMode="stretch" />
        </View>
      ) : null}
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </KeyboardAvoidingView>
  );
}

export function OnboardingButton({
  label,
  onPress,
  variant = "solid",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: "solid" | "outline";
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "outline" && styles.outline,
        (pressed || disabled) && styles.dim,
      ]}
    >
      <Text
        style={[styles.buttonText, variant === "outline" && styles.outlineText]}
      >
        {label}
      </Text>
      <Text
        style={[styles.buttonText, variant === "outline" && styles.outlineText]}
      >
        ›
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white, overflow: "hidden" },
  topCrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 115,
    overflow: "hidden",
  },
  topImage: {
    position: "absolute",
    top: -154,
    left: -12,
    width: "106%",
    height: 268,
    transform: [{ rotate: "180deg" }],
  },
  bottomImage: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "100%",
    height: 268,
  },
  fill: { width: "100%", height: "100%" },
  scroll: { flexGrow: 1 },
  content: { flex: 1, paddingHorizontal: 24 },
  back: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -7,
  },
  button: {
    minHeight: 54,
    backgroundColor: colors.patient.primaryDark,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 18,
  },
  outline: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#D2D2D2",
  },
  dim: { opacity: 0.65 },
  buttonText: {
    color: colors.white,
    fontFamily: "AlbertSans_600SemiBold",
    fontSize: 18,
  },
  outlineText: { color: colors.patient.primaryDark },
});
