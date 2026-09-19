import { StyleSheet, Switch, Text, View } from "react-native";
import { Siren } from "lucide-react-native";
import { fontFamilies } from "@startup/design-tokens";

export function EmergencyModeCard({
  emergency,
  onEmergencyChange,
}: {
  emergency: boolean;
  onEmergencyChange: (val: boolean) => void;
}) {
  return (
    <View style={[styles.emergencyCard, emergency && styles.emergencyCardActive]}>
      <View style={styles.emergencyLeft}>
        <View
          style={[
            styles.emergencyIconBox,
            emergency && styles.emergencyIconBoxActive,
          ]}
        >
          <Siren color={emergency ? "#DC2626" : "#087F78"} size={20} />
        </View>
        <View style={styles.emergencyCopy}>
          <Text style={styles.emergencyTitle}>Emergency Mode</Text>
          <Text style={styles.emergencySubtitle}>
            {emergency
              ? "Critical priority dispatch enabled"
              : "Turn on for immediate critical response"}
          </Text>
        </View>
      </View>
      <Switch
        value={emergency}
        onValueChange={onEmergencyChange}
        trackColor={{ false: "#D8E3E6", true: "#087F78" }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emergencyCard: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#E8F5F4",
  },
  emergencyCardActive: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.3)",
  },
  emergencyLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginRight: 8,
  },
  emergencyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  emergencyIconBoxActive: {
    backgroundColor: "#FEE2E2",
  },
  emergencyCopy: { flex: 1, gap: 2 },
  emergencyTitle: {
    color: "#0C2434",
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
  },
  emergencySubtitle: {
    color: "#71818F",
    fontFamily: fontFamilies.regular,
    fontSize: 11,
  },
});
