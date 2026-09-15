import { View } from "react-native";
import { router } from "expo-router";
import { Button } from "@startup/mobile-ui";
import { VerificationScreen } from "../screens/registration/RegistrationScreens";
import { useDriver } from "../store/driver";
export default function VerificationRoute() {
  const d = useDriver();
  return (
    <View style={{ flex: 1 }}>
      <VerificationScreen
        verified={d.verified}
        onBack={() => router.back()}
        onDashboard={() => router.replace("/home")}
      />
      {!d.verified && (
        <View style={{ padding: 16 }}>
          <Button
            theme="driver"
            variant="outline"
            label="Preview verified state"
            onPress={d.previewVerified}
          />
        </View>
      )}
    </View>
  );
}
