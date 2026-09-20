import { StyleSheet, Text, View } from "react-native";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import { patientProfile } from "../../utils/profileConstants";

export function ProfileStats({
  age = patientProfile.age,
  blood = patientProfile.blood,
  bookings = patientProfile.bookings,
}: {
  age?: string;
  blood?: string;
  bookings?: string;
}) {
  return (
    <View style={styles.stats}>
      <ProfileStat label="Age" value={age} />
      <ProfileStat label="Blood" value={blood} />
      <ProfileStat label="Bookings" value={bookings} />
    </View>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: "row",
    gap: 10,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.patient.surfaceBorder,
    borderRadius: radius.md,
    backgroundColor: "#F0FAF9",
  },
  statLabel: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.medium,
    fontSize: 9,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  statValue: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
  },
});
