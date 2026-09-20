import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { fontFamilies } from "@startup/design-tokens";

export function ActionButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        style,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
  actionButton: {
    height: 51,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#087F78",
  },
  actionText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.bold,
    fontSize: 15,
  },
});
