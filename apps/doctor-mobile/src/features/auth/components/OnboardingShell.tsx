import { styles } from "./OnboardingShell.styles";
import { city } from "../utils/onboardingConstants";
import type { OnboardingShellProps } from "../types/onboarding-shell";

import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { colors } from "@startup/design-tokens";
import { FadedScrollView } from "@startup/mobile-ui";
import { keyboardScrollAdjustment } from "../utils/keyboardScroll";

export function OnboardingShell({
  children,
  onBack,
  bottomArt = true,
  scroll = false,
  keepArtFixed = false,
  showArt = true,
  centerContent = false,
}: OnboardingShellProps) {
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
      if (
        !focusedInput ||
        keyboardY === undefined ||
        keyboardY === null ||
        !viewport
      )
        return;
      viewport.measureInWindow((_x, viewportY, _width, viewportHeight) => {
        if (!mounted.current || !Keyboard.isVisible()) return;
        // Supply scroll room when Android overlays instead of resizing the window.
        setKeyboardInset(
          Math.max(0, viewportY + viewportHeight - keyboardY) + 24
        );
        focusedInput.measureInWindow(
          (_inputX, inputY, _inputWidth, inputHeight) => {
            if (
              !mounted.current ||
              TextInput.State.currentlyFocusedInput() !== focusedInput ||
              !Keyboard.isVisible()
            )
              return;
            const delta = keyboardScrollAdjustment({
              inputTop: inputY,
              inputHeight,
              viewportTop: viewportY,
              viewportHeight,
              keyboardTop: keyboardY,
            });
            if (Math.abs(delta) > 1) {
              scrollRef.current?.scrollTo({
                y: Math.max(0, scrollOffset.current + delta),
                animated: true,
              });
            }
          }
        );
      });
    });
  }

  useEffect(() => {
    mounted.current = true;
    const show = Keyboard.addListener("keyboardDidShow", (event) => {
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
        <View
          pointerEvents="none"
          style={[styles.topCrop, keepArtFixed && styles.profileTopCrop]}
        >
          <Image source={city} style={styles.topImage} resizeMode="stretch" />
        </View>
      ) : null}
      {showArt && bottomArt && !keyboardVisible ? (
        <View
          pointerEvents="none"
          style={[styles.bottomImage, keepArtFixed && styles.fixedProfileArt]}
        >
          <Image
            source={city}
            style={keepArtFixed ? styles.profileBottomImage : styles.fill}
            resizeMode="stretch"
          />
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
              {
                marginTop: keyboardVisible
                  ? 16
                  : Math.max(
                      16,
                      101 - (onBack ? Math.max(insets.top, 12) + 46 : 0)
                    ),
              },
              (!bottomArt || keyboardVisible) && { marginBottom: 0 },
            ]}
            contentContainerStyle={[
              styles.scroll,
              { paddingBottom: keyboardInset },
            ]}
            edgeColor={colors.white}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onFocus={revealFocusedInput}
            onLayout={revealFocusedInput}
            onContentSizeChange={revealFocusedInput}
            onScroll={(event) => {
              scrollOffset.current = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            {content}
          </FadedScrollView>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[
              styles.scroll,
              { paddingBottom: keyboardInset },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onFocus={revealFocusedInput}
            onLayout={revealFocusedInput}
            onContentSizeChange={revealFocusedInput}
            onScroll={(event) => {
              scrollOffset.current = event.nativeEvent.contentOffset.y;
            }}
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

export { OnboardingButton } from "./OnboardingButton";

export { onboardingButtonStyles } from "./OnboardingButton.styles";
