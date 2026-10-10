import { useLocalSearchParams } from "expo-router";
import { Linking } from "react-native";
import { Button } from "@startup/mobile-ui";
import { DoctorScreen, Label, Panel } from "../../../components/DoctorScreen";
const options: Record<string, string> = {
  "My Ratings & Reviews": "Patient reviews are not connected yet.",
  "Earnings & Payouts": "Payout statements are not connected yet.",
  "Notification Preferences":
    "Manage Clinzo notification permissions in your device settings.",
  "Help & Support":
    "Your clinic or operator can provide support contact details. For an emergency, call local emergency services.",
  "Privacy Policy":
    "Your profile and submitted documents are used for account verification and care workflows. Contact your clinic or operator with questions about your data.",
};
export function ProfileOptionScreen() {
  const { option } = useLocalSearchParams<{ option?: string }>();
  const title = option && Object.hasOwn(options, option) ? option : "Profile";
  return (
    <DoctorScreen title={title} bottomNav={false}>
      <Panel>
        <Label muted>
          {options[title] ?? "This profile option is not available."}
        </Label>
        {title === "Notification Preferences" ? (
          <Button
            label="Open device settings"
            theme="doctor"
            onPress={() => {
              void Linking.openSettings();
            }}
          />
        ) : null}
      </Panel>
    </DoctorScreen>
  );
}
