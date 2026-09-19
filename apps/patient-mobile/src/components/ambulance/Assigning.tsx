import { StyleSheet, Text, View } from "react-native";
import { Siren } from "lucide-react-native";
import { fontFamilies } from "@startup/design-tokens";

export function Assigning() {
  return (
    <View style={styles.assigningBody}>
      <View style={styles.ring1}>
        <View style={styles.ring2}>
          <View style={styles.ring3}>
            <Siren color="#008877" size={40} />
          </View>
        </View>
      </View>
      <Text style={styles.assigningTitle}>Assigning the ambulance driver</Text>
      <Text style={styles.assigningSubtitle}>We'll reach you soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  assigningBody: { flex: 1, alignItems: "center", paddingTop: 111 },
  ring1: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 60,
    backgroundColor: "rgba(0,136,119,0.1)",
  },
  ring2: {
    width: 90,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 45,
    backgroundColor: "rgba(0,136,119,0.1)",
  },
  ring3: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    backgroundColor: "rgba(0,136,119,0.1)",
  },
  assigningTitle: {
    marginTop: 66,
    color: "#008877",
    fontFamily: fontFamilies.bold,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  assigningSubtitle: {
    marginTop: 22,
    color: "#71818F",
    fontFamily: fontFamilies.bold,
    fontSize: 14,
  },
});
