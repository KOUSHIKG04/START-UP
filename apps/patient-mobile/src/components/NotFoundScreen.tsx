import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { colors, fontFamilies } from "@startup/design-tokens";

export function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Screen not found</Text>
      <Link href="/" style={styles.link}>
        Go to Home
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: colors.patient.background,
  },
  title: {
    fontFamily: fontFamilies.semibold,
    fontSize: 20,
    color: colors.patient.text,
  },
  link: {
    fontFamily: fontFamilies.medium,
    color: colors.patient.primaryDark,
    padding: 12,
  },
});
