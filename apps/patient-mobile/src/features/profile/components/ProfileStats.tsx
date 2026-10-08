import { StyleSheet, Text, View } from "react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { Card } from "@startup/mobile-ui";

export function ProfileStats({ age, blood }: { age: string; blood: string }) {
  return (
    <View style={styles.stats}>
      <ProfileStat label="Age" value={age} />
      <ProfileStat label="Blood group" value={blood} />
    </View>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <Card
      theme="patient"
      variant="outlined"
      borderColor={colors.border}
      borderRadius={12}
      padding={12}
      gap={4}
      style={styles.stat}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", gap: 8 },
  stat: {
    flex: 1,
    height: 65.5,
    paddingVertical: 0,
    justifyContent: "center",
    elevation: 0,
    shadowOpacity: 0,
    boxShadow: "none",
  },
  label: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    lineHeight: 16,
  },
  value: {
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
    lineHeight: 21,
  },
});
