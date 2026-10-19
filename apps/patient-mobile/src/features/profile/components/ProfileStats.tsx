import type { ProfileStatsProps } from "../types/profile";
import { AppText as Text } from "@startup/mobile-ui";
import { StyleSheet, View } from "react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { Card, useReadableTypography } from "@startup/mobile-ui";

export function ProfileStats({ age, blood }: ProfileStatsProps) {
  return (
    <View style={styles.stats}>
      <ProfileStat label="Age" value={age} />
      <ProfileStat label="Blood group" value={blood} />
    </View>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  const readable = useReadableTypography();
  return (
    <Card
      theme="patient"
      variant="outlined"
      borderColor={colors.border}
      borderRadius={10}
      padding={8}
      gap={4}
      style={[
        styles.stat,
        readable && { height: undefined, minHeight: 44, paddingVertical: 6 },
      ]}
    >
      <Text
        variant="label"
        style={styles.label}
        numberOfLines={readable ? 2 : 1}
        adjustsFontSizeToFit={!readable}
        minimumFontScale={0.9}
      >
        {label}:{" "}
        <Text variant="body" style={styles.value}>
          {value}
        </Text>
      </Text>
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
