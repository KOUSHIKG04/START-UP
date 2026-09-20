import { Linking } from "react-native";
import { router } from "expo-router";
import { SosEmergencyScreen } from "../../../features/ambulance/screens/SosEmergencyScreen";

export default function SosRoute() {
  return (
    <SosEmergencyScreen
      onCancel={() => router.back()}
      onCallEmergency={() => void Linking.openURL("tel:112")}
    />
  );
}
