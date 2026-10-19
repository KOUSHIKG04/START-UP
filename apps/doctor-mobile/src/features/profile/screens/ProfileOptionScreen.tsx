import { options } from "../utils/profileOptionsConstants";
import { useLocalSearchParams } from "expo-router";
import { Linking } from "react-native";
import { Button } from "@startup/mobile-ui";
import { DoctorScreen, Label, Panel } from "../../../components/DoctorScreen";

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
