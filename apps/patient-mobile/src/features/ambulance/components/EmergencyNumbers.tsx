import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Phone } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { emergencyNumbers } from "../utils/ambulanceConstants";

export function EmergencyNumbers() {
  return (
    <View style={styles.numberRow}>
      {emergencyNumbers.map((item) => (
        <Pressable
          key={item.number}
          onPress={() => void Linking.openURL(`tel:${item.number}`)}
          style={({ pressed }) => [styles.numberCard, pressed && styles.pressed]}
        >
          <View style={styles.numberHeader}>
            <Phone color="#087F78" size={13} />
            <Text style={styles.numberText}>{item.number}</Text>
          </View>
          <Text numberOfLines={1} style={styles.numberLabel}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
  numberRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
  },
  numberCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  numberHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  numberText: {
    color: "#087F78",
    fontFamily: fontFamilies.bold,
    fontSize: 16,
  },
  numberLabel: {
    color: "#71818F",
    fontFamily: fontFamilies.medium,
    fontSize: 11,
  },
});
