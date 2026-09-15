import { useRef, useState } from "react";
import { Image, Linking, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button } from "@startup/mobile-ui";
import { MessageCircle, Navigation, Phone } from "lucide-react-native";
import { fontFamilies } from "@startup/design-tokens";
import {
  DoctorScreen,
  Heading,
  Label,
  MissingPatient,
  palette,
  Panel,
  ui,
} from "../../components/DoctorScreen";
import { useVisit, visitRoute } from "../../utils/consultation";
export function HomeVisitScreen() {
  const { patient, appointment } = useVisit();
  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const inputs = useRef<(TextInput | null)[]>([]);
  if (!patient || !appointment) return <MissingPatient />;
  const navigate = async () => {
    try {
      await Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(patient.address)}`
      );
    } catch {
      setError("Unable to open maps. Use the address shown below.");
    }
  };
  return (
    <DoctorScreen
      title="Home visit"
      subtitle={`Appointment – ${appointment.date || "Today"}, ${appointment.time || "5:30 PM"}`}
      bottomNav={false}
    >
      <Image
        source={require("../../../assets/figma/map.png")}
        accessibilityLabel="Reference map showing the home visit area in Bengaluru"
        style={{ width: "100%", height: 216, borderRadius: 14, marginTop: 6 }}
        resizeMode="cover"
      />
      <View style={[ui.row, { gap: 8 }]}>
        <Button
          theme="doctor"
          label="Chat"
          leftIcon={<MessageCircle size={17} color="white" />}
          onPress={() => router.push(visitRoute("chat", appointment))}
          style={{ paddingHorizontal: 10 }}
        />
        <Button
          theme="doctor"
          label="Phone"
          leftIcon={<Phone size={17} color="white" />}
          onPress={() =>
            setError(
              "A patient phone number is not connected in this demo. Use Chat to try the local messaging flow."
            )
          }
          style={{ paddingHorizontal: 10 }}
        />
        <Button
          theme="doctor"
          label="Start navigation"
          leftIcon={<Navigation size={16} color="white" />}
          onPress={() => void navigate()}
          style={{ flex: 1, paddingHorizontal: 6 }}
          labelStyle={{ fontSize: 12 }}
        />
      </View>
      <Panel style={{ marginTop: 16, gap: 0 }}>
        <Heading>{patient.name}</Heading>
        <Label style={{ fontSize: 12, lineHeight: 18 }}>
          {patient.address}
        </Label>
      </Panel>
      <View style={{ gap: 18, alignItems: "center", paddingVertical: 30 }}>
        <Heading
          style={{
            fontSize: 18,
            fontFamily: fontFamilies.regular,
            color: palette.text,
          }}
        >
          Enter Patient’s PIN to Proceed
        </Heading>
        <View style={ui.row}>
          {[0, 1, 2, 3].map((index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputs.current[index] = ref;
              }}
              accessibilityLabel={`Patient PIN digit ${index + 1}`}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              maxLength={4}
              value={pin[index]}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === "Backspace" && !pin[index] && index > 0)
                  inputs.current[index - 1]?.focus();
              }}
              onChangeText={(value) => {
                const digits = value.replace(/\D/g, "");
                if (digits.length === 4) {
                  setPin(digits.split(""));
                  inputs.current[3]?.blur();
                } else {
                  setPin((current) =>
                    current.map((digit, position) =>
                      position === index ? digits.slice(-1) : digit
                    )
                  );
                  if (digits && index < 3) inputs.current[index + 1]?.focus();
                }
                setError("");
              }}
              style={{
                width: 46,
                height: 48,
                borderRadius: 13,
                borderWidth: 1,
                borderColor: palette.border,
                textAlign: "center",
                fontFamily: fontFamilies.semibold,
                fontSize: 20,
                color: palette.text,
                backgroundColor: "white",
              }}
            />
          ))}
        </View>
        <Label muted style={{ fontSize: 12 }}>
          Demo PIN: {patient.pin}
        </Label>
      </View>
      {!!error && <Label style={ui.error}>{error}</Label>}
      <Button
        theme="doctor"
        label="Start Consultation"
        onPress={() => {
          if (pin.join("") !== patient.pin) {
            setError("The PIN does not match. Enter the demo PIN shown above.");
            return;
          }
          router.push(visitRoute("clinical-notes", appointment));
        }}
        style={{ marginTop: 8 }}
      />
    </DoctorScreen>
  );
}
