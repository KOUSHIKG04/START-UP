import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontFamilies } from "@startup/design-tokens";

export function BloodGroupSelector({
  bloodGroups,
  value,
  onChange,
}: {
  bloodGroups: readonly string[];
  value: string;
  onChange: (group: string) => void;
}) {
  return (
    <View style={styles.bloodGrid}>
      {bloodGroups.map((item) => (
        <Pressable
          key={item}
          accessibilityRole="button"
          accessibilityState={{ selected: value === item }}
          onPress={() => onChange(item)}
          style={[styles.blood, value === item && styles.selectedBlood]}
        >
          <Text
            style={[
              styles.bloodText,
              value === item && styles.selectedBloodText,
            ]}
          >
            {item}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bloodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  blood: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#FAFAFA",
    minWidth: 48,
    alignItems: "center",
  },
  selectedBlood: {
    borderColor: colors.patient.primary,
    backgroundColor: "#E6F4F5",
  },
  bloodText: {
    fontSize: 14,
    fontFamily: fontFamilies.medium,
    color: colors.patient.text,
  },
  selectedBloodText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
  },
});
