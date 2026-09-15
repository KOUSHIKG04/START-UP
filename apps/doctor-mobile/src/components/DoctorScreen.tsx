import type { PropsWithChildren, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { FadedScrollView, Button } from "@startup/mobile-ui";

export const palette = {
  ...colors.doctor,
  white: colors.white,
  muted: "#71818F",
  card: "#0A8C84",
  subtle: "#F2F7F7",
  danger: colors.danger,
};
export function Label({
  children,
  style,
  muted = false,
}: PropsWithChildren<{ style?: StyleProp<TextStyle>; muted?: boolean }>) {
  return (
    <Text style={[ui.text, muted && { color: palette.muted }, style]}>
      {children}
    </Text>
  );
}
export function Heading({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<TextStyle> }>) {
  return (
    <Text accessibilityRole="header" style={[ui.heading, style]}>
      {children}
    </Text>
  );
}
export function IconButton({
  children,
  label,
  onPress,
  style,
  disabled = false,
}: PropsWithChildren<{
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ui.iconButton,
        style,
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      {children}
    </Pressable>
  );
}
export function DoctorHeader({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[ui.header, { paddingTop: insets.top + 16 }]}>
      <IconButton
        label="Go back"
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/")
        }
      >
        <ChevronLeft size={26} color={palette.primary} />
      </IconButton>
      <View style={ui.flex}>
        <Heading style={{ fontSize: 17 }}>{title}</Heading>
        {subtitle && (
          <Label muted style={{ fontSize: 12 }}>
            {subtitle}
          </Label>
        )}
      </View>
      {trailing}
    </View>
  );
}
export function DoctorScreen({
  children,
  title,
  subtitle,
  background = palette.white,
  bottomNav = true,
  contentStyle,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  background?: string;
  bottomNav?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}>) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={[ui.screen, { backgroundColor: background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <DoctorHeader title={title} subtitle={subtitle} />
      <FadedScrollView
        edgeColor={background}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          ui.content,
          { paddingBottom: (bottomNav ? 125 : 24) + insets.bottom },
          contentStyle,
        ]}
      >
        {children}
      </FadedScrollView>
    </KeyboardAvoidingView>
  );
}
export function MissingPatient() {
  return (
    <DoctorScreen title="Patient not found">
      <Label>
        This visit could not be found. Open an appointment or scan a demo
        patient QR code.
      </Label>
      <Button
        theme="doctor"
        label="Patient lookup"
        onPress={() => router.replace("/scan-qr")}
      />
    </DoctorScreen>
  );
}
export function Panel({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[ui.panel, style]}>{children}</View>;
}
export function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        ui.choice,
        selected && { backgroundColor: palette.primary },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Label
        style={{ fontSize: 12, color: selected ? palette.white : palette.dark }}
      >
        {label}
      </Label>
    </Pressable>
  );
}
export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.white },
  content: { padding: 16, gap: 16, flexGrow: 1 },
  flex: { flex: 1, minWidth: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  text: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 20,
    color: palette.text,
  },
  heading: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    lineHeight: 22,
    color: palette.header,
  },
  header: {
    backgroundColor: palette.chart,
    paddingHorizontal: 16,
    paddingBottom: 16,
    minHeight: 96,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  panel: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  choice: {
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: palette.surface,
  },
  divider: { height: 1, backgroundColor: palette.border },
  error: {
    color: palette.danger,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    lineHeight: 19,
  },
  success: {
    color: palette.dark,
    backgroundColor: palette.surface,
    padding: 12,
    borderRadius: 10,
  },
  field: { maxWidth: "100%" },
});
