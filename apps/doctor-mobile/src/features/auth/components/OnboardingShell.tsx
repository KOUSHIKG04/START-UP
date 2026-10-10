import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { colors } from "@startup/design-tokens";
import { Button, FadedScrollView } from "@startup/mobile-ui";
import { keyboardScrollAdjustment } from "./keyboardScroll";

const city = require("../../../../assets/images/onboarding/city.png");

export function OnboardingShell({
  children,
  onBack,
  bottomArt = true,
  scroll = false,
  keepArtFixed = false,
  showArt = true,
  centerContent = false,
}: {
  children: ReactNode;
  onBack?: () => void;
  bottomArt?: boolean;
  scroll?: boolean;
  keepArtFixed?: boolean;
  showArt?: boolean;
  centerContent?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const focusFrame = useRef<number | null>(null);
  const scrollOffset = useRef(0);
  const keyboardTop = useRef<number | null>(null);
  const mounted = useRef(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);

  function revealFocusedInput() {
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => {
      focusFrame.current = null;
      const focusedInput = TextInput.State.currentlyFocusedInput();
      const keyboardY = keyboardTop.current ?? Keyboard.metrics()?.screenY;
      const viewport = scrollRef.current?.getNativeScrollRef();
      if (!focusedInput || keyboardY === undefined || keyboardY === null || !viewport) return;
      viewport.measureInWindow((_x, viewportY, _width, viewportHeight) => {
        if (!mounted.current || !Keyboard.isVisible()) return;
        // Supply scroll room when Android overlays instead of resizing the window.
        setKeyboardInset(Math.max(0, viewportY + viewportHeight - keyboardY) + 24);
        focusedInput.measureInWindow((_inputX, inputY, _inputWidth, inputHeight) => {
          if (!mounted.current || TextInput.State.currentlyFocusedInput() !== focusedInput || !Keyboard.isVisible()) return;
          const delta = keyboardScrollAdjustment({ inputTop: inputY, inputHeight,
            viewportTop: viewportY, viewportHeight, keyboardTop: keyboardY });
          if (Math.abs(delta) > 1) {
            scrollRef.current?.scrollTo({ y: Math.max(0, scrollOffset.current + delta), animated: true });
          }
        });
      });
    });
  }

  useEffect(() => {
    mounted.current = true;
    const show = Keyboard.addListener("keyboardDidShow", event => {
      keyboardTop.current = event.endCoordinates.screenY;
      setKeyboardVisible(true);
      setKeyboardInset(event.endCoordinates.height + 24);
      revealFocusedInput();
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      keyboardTop.current = null;
      setKeyboardVisible(false);
      setKeyboardInset(0);
    });
    return () => {
      mounted.current = false;
      show.remove();
      hide.remove();
      if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    };
  }, []);
  const content = (
    <View
      style={[
        styles.content,
        centerContent && styles.centeredContent,
        {
          paddingTop: onBack ? 8 : Math.max(insets.top, 12) + 8,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      {children}
    </View>
  );
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="dark" />
      {showArt && !(keepArtFixed && keyboardVisible) ? (
        <View pointerEvents="none" style={[styles.topCrop, keepArtFixed && styles.profileTopCrop]}>
          <Image source={city} style={styles.topImage} resizeMode="stretch" />
        </View>
      ) : null}
      {showArt && bottomArt && !keyboardVisible ? (
        <View
          pointerEvents="none"
          style={[styles.bottomImage, keepArtFixed && styles.fixedProfileArt]}
        >
          <Image source={city} style={keepArtFixed ? styles.profileBottomImage : styles.fill} resizeMode="stretch" />
        </View>
      ) : null}
      {onBack ? (
        <View
          style={{
            paddingTop: Math.max(insets.top, 12) + 4,
            paddingHorizontal: 24,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={styles.back}
          >
            <ChevronLeft size={24} color={colors.patient.primaryDark} />
          </Pressable>
        </View>
      ) : null}
      {scroll ? (
        keepArtFixed && showArt ? (
          <FadedScrollView
            ref={scrollRef}
            containerStyle={[
              styles.scrollBetweenArt,
              { marginTop: keyboardVisible ? 16 : Math.max(16, 101 - (onBack ? Math.max(insets.top, 12) + 46 : 0)) },
              (!bottomArt || keyboardVisible) && { marginBottom: 0 },
            ]}
            contentContainerStyle={[styles.scroll, { paddingBottom: keyboardInset }]}
            edgeColor={colors.white}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onFocus={revealFocusedInput}
            onLayout={revealFocusedInput}
            onContentSizeChange={revealFocusedInput}
            onScroll={event => { scrollOffset.current = event.nativeEvent.contentOffset.y; }}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            {content}
          </FadedScrollView>
        ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.scroll, { paddingBottom: keyboardInset }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onFocus={revealFocusedInput}
          onLayout={revealFocusedInput}
          onContentSizeChange={revealFocusedInput}
          onScroll={event => { scrollOffset.current = event.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
        )
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
  loading = false,
}: {
  label: string;
  onPress: () => void;
  variant?: "solid" | "outline";
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Button
      label={label}
      theme="doctor"
      variant={variant === "outline" ? "outline" : "primary"}
      loading={loading}
      disabled={disabled}
      onPress={onPress}
      labelStyle={[
        styles.buttonText,
        variant === "outline" && styles.outlineText,
      ]}
      rightIcon={
        <Text
          style={[
            styles.buttonText,
            variant === "outline" && styles.outlineText,
          ]}
        >
          ›
        </Text>
      }
      style={({ pressed }) => [
        styles.button,
        variant === "outline" && styles.outline,
        (pressed || disabled) && styles.dim,
      ]}
    />
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
  profileTopCrop: { height: 85 },
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
  scrollBetweenArt: {
    flex: 1,
    marginTop: 16,
    marginBottom: 115,
    backgroundColor: colors.white,
  },
  fixedProfileArt: { height: 115, bottom: -16, overflow: "hidden" },
  profileBottomImage: {
    position: "absolute",
    bottom: -154,
    left: -12,
    width: "106%",
    height: 268,
  },
  content: { flex: 1, paddingHorizontal: 24 },
  centeredContent: { justifyContent: "center", alignItems: "center" },
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
    fontSize: 16,
    lineHeight: 22,
  },
  outlineText: { color: colors.patient.primaryDark },
});

// Styling overrides preserve the established onboarding design using the shared Button.
export const onboardingButtonStyles = {
  button: styles.button,
  label: styles.buttonText,
  outline: styles.outline,
  outlineLabel: [styles.buttonText, styles.outlineText],
};
