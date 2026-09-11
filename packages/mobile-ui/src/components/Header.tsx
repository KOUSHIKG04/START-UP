import { ChevronLeft } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewProps,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors, typography } from "@startup/design-tokens";
import { appBackgrounds, type HeaderApp } from "../utils/headerBackground";

export type { HeaderApp } from "../utils/headerBackground";

export type HeaderProps = ViewProps & {
  title: string;
  onBackPress: () => void;
  app?: HeaderApp;
  backgroundColor?: string;
  foregroundColor?: string;
  titleStyle?: TextStyle;
  backAccessibilityLabel?: string;
  safeAreaEdges?: readonly Edge[];
};

export function Header({
  title,
  onBackPress,
  app = "patient",
  backgroundColor,
  foregroundColor = colors.white,
  titleStyle,
  style,
  backAccessibilityLabel = "Go back",
  safeAreaEdges = ["top"],
  ...props
}: HeaderProps) {
  const appBackground = appBackgrounds[app];
  const resolvedBackgroundColor =
    backgroundColor ??
    (appBackground.type === "solid"
      ? appBackground.color
      : appBackground.colors[0]);

  return (
    <View
      accessibilityRole="header"
      {...props}
      style={[{ backgroundColor: resolvedBackgroundColor }, style]}
    >
      {!backgroundColor && appBackground.type === "gradient" ? (
        <LinearGradient
          pointerEvents="none"
          colors={appBackground.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      <SafeAreaView edges={safeAreaEdges}>
        <View style={styles.container}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={backAccessibilityLabel}
            hitSlop={12}
            onPress={onBackPress}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <ChevronLeft color={foregroundColor} size={30} strokeWidth={2.5} />
          </Pressable>

          <Text
            numberOfLines={1}
            style={[styles.title, { color: foregroundColor }, titleStyle]}
          >
            {title}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 76,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    transform: [{ translateY: -3 }],
  },
  backButton: {
    width: 32,
    height: 44,
    marginRight: 16,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  title: {
    ...typography.headerText,
    flex: 1,
  },
});
