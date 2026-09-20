import { StyleSheet, Text, View } from "react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { patientProfile } from "../../utils/profileConstants";

export function ProfileIdentity({
  initials = patientProfile.initials,
  name = patientProfile.name,
}: {
  initials?: string;
  name?: string;
}) {
  return (
    <View style={styles.identity}>
      <View style={styles.avatar}>
        <Text style={styles.initials}>{initials}</Text>
      </View>
      <Text style={styles.name}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  identity: {
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  avatar: {
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#087F78",
    borderRadius: 38,
    backgroundColor: "#C8EDE9",
  },
  initials: {
    color: "#1A3A6B",
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    fontWeight: "700",
  },
  name: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    fontWeight: "700",
  },
});
