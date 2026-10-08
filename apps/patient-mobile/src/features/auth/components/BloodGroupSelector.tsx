import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { PROFILE_FIELD_HEIGHT } from "./profileFormStyles";

export function BloodGroupSelector({
  bloodGroups,
  value,
  onChange,
  invalid = false,
}: {
  bloodGroups: readonly string[];
  value: string;
  onChange: (group: string) => void;
  invalid?: boolean;
}) {
  return (
    <View style={styles.bloodGrid}>
      {bloodGroups.map((item) => (
        <Pressable
          key={item}
          accessibilityRole="button"
          accessibilityLabel={`Blood group ${item}`}
          accessibilityState={{ selected: value === item }}
          hitSlop={6}
          onPress={() => onChange(item)}
          style={[styles.blood, value === item && styles.selectedBlood, invalid && styles.invalid]}
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
  invalid: { borderColor: colors.danger },
  bloodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  blood: {
    borderWidth: 1,
    borderColor: "#D1D1D1",
    borderRadius: 12,
    height: PROFILE_FIELD_HEIGHT,
    width: "22%",
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedBlood: {
    borderColor: colors.patient.primaryDark,
    backgroundColor: colors.patient.primaryDark,
  },
  bloodText: {
    fontSize: 14,
    fontFamily: fontFamilies.medium,
    color: colors.patient.text,
  },
  selectedBloodText: {
    color: colors.white,
    fontFamily: fontFamilies.bold,
  },
});
