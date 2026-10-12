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
      borderRadius={10}
      padding={8}
      gap={4}
      style={styles.stat}
    >
      <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9}>{label}: <Text style={styles.value}>{value}</Text></Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", gap: 8 },
  stat: {
    flexShrink: 1,
    minWidth: 0,
    height: 36,
    paddingVertical: 0,
    justifyContent: "center",
    elevation: 0,
    shadowOpacity: 0,
    boxShadow: "none",
  },
  label: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 20,
  },
  value: {
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
    lineHeight: 21,
  },
});
