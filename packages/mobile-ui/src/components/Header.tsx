import { ChevronLeft } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Pressable,
  Text,
  View,
  type TextStyle,
  type ViewProps,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors } from "@startup/design-tokens";
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
  className?: string;
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
  className,
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
      className={className}
      style={[{ backgroundColor: resolvedBackgroundColor }, style]}
    >
      {!backgroundColor && appBackground.type === "gradient" ? (
        <LinearGradient
          pointerEvents="none"
          colors={appBackground.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: "absolute", inset: 0 }}
        />
      ) : null}

      <SafeAreaView edges={safeAreaEdges}>
        <View className="min-h-[76px] -translate-y-[3px] flex-row items-center px-5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={backAccessibilityLabel}
            hitSlop={12}
            onPress={onBackPress}
            className="mt-0.5 mr-4 h-11 w-8 items-center justify-center active:opacity-70"
          >
            <ChevronLeft color={foregroundColor} size={30} strokeWidth={2.5} />
          </Pressable>

          <Text
            numberOfLines={1}
            className="text-app-header flex-1"
            style={[{ color: foregroundColor }, titleStyle]}
          >
            {title}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
