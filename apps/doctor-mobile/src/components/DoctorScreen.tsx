import { StatusBar } from "expo-status-bar";
import type { PropsWithChildren, ReactNode } from "react";
import { useEffect } from "react";
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
import {
  FadedScrollView,
  Button,
  Header,
  useKeyboardAwareScroll,
} from "@startup/mobile-ui";
import { palette, ui } from "./theme";

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
  trailing,
  onBackPress,
}: {
  title: string;
  trailing?: ReactNode;
  onBackPress?: () => void;
}) {
  return (
    <>
      <StatusBar style="light" />
      <Header
        title={title}
        app="doctor"
        rightAction={trailing}
        onBackPress={
          onBackPress ??
          (() => (router.canGoBack() ? router.back() : router.replace("/")))
        }
      />
    </>
  );
}

export function DoctorScreen({
  children,
  title,
  background = palette.white,
  bottomNav = true,
  contentStyle,
  onBackPress,
  scrollResetKey,
}: PropsWithChildren<{
  title: string;
  background?: string;
  bottomNav?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  onBackPress?: () => void;
  scrollResetKey?: number;
}>) {
  const insets = useSafeAreaInsets();
  const { scrollRef, keyboardInset, revealFocusedInput, onScroll } =
    useKeyboardAwareScroll();
  useEffect(() => {
    if (scrollResetKey !== undefined)
      scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [scrollResetKey, scrollRef]);
  return (
    <KeyboardAvoidingView
      style={[ui.screen, { backgroundColor: background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <DoctorHeader title={title} onBackPress={onBackPress} />
      <FadedScrollView
        ref={scrollRef}
        edgeColor={background}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onFocus={revealFocusedInput}
        onLayout={revealFocusedInput}
        onContentSizeChange={revealFocusedInput}
        onScroll={onScroll}
        contentContainerStyle={[
          ui.content,
          contentStyle,
          {
            paddingBottom:
              (bottomNav ? 125 : 24) + insets.bottom + keyboardInset,
          },
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
