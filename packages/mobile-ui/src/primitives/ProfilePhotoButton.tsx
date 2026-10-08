import { ActivityIndicator, Image, Pressable, StyleSheet, View, type ImageSourcePropType } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Plus } from "lucide-react-native";
import { colors } from "@startup/design-tokens";
import { useMobileTheme } from "../theme/MobileThemeProvider";
import type { AppTheme } from "../utils/appTheme";

export function ProfilePhotoButton({ source, onPress, theme, size = 76, disabled = false, loading = false,
  accessibilityLabel = "Choose profile photo" }: {
  source?: ImageSourcePropType;
  onPress?: () => void;
  theme?: AppTheme;
  size?: number;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
}) {
  const palette = useMobileTheme(theme);
  const badgeSize = Math.round(size * 0.38);
  return (
    <Pressable accessibilityRole={onPress ? "button" : "image"}
      accessibilityLabel={onPress ? accessibilityLabel : "Profile picture"}
      accessibilityState={onPress ? { disabled: disabled || loading, busy: loading } : undefined}
      disabled={disabled || loading || !onPress} onPress={onPress}
      style={({ pressed }) => [{ width: size, height: size }, pressed && styles.pressed]}>
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden" }}>
        {loading ? <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={palette.primary} /></View> : source ? <Image source={source} style={{ width: size, height: size }} resizeMode="cover" /> : (
          <Svg width={size} height={size} viewBox="0 0 100 100">
            <Circle cx="50" cy="50" r="50" fill={palette.primary} />
            <Circle cx="50" cy="35" r="20" fill={colors.white} />
            <Path d="M0 100C0 72 25 59 50 59S100 72 100 100Z" fill={colors.white} />
          </Svg>
        )}
      </View>
      {onPress && !loading ? <View pointerEvents="none" style={[styles.badge, {
        width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2,
        backgroundColor: palette.primary,
      }]}><Plus size={badgeSize * 0.65} strokeWidth={2.5} color={colors.white} /></View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  badge: { position: "absolute", right: -2, bottom: -2, borderWidth: 3,
    borderColor: colors.white, alignItems: "center", justifyContent: "center" },
});
