import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, MessageCircle, MicOff, Mic, SwitchCamera, PhoneOff, User } from "lucide-react-native";
import { Button } from "@startup/mobile-ui";
import {
  Heading,
  IconButton,
  Label,
  MissingPatient,
  palette,
  ui,
} from "../../components/DoctorScreen";
import { useVisit, visitRoute } from "../../utils/consultation";
export function OnlineConsultationScreen() {
  const { patient, appointment } = useVisit();
  const [muted, setMuted] = useState(false);
  const [front, setFront] = useState(true);
  const [ending, setEnding] = useState(false);
  if (!patient || !appointment) return <MissingPatient />;
  return (
    <SafeAreaView style={styles.screen}>
      <View style={ui.row}>
        <IconButton
          label="Go back"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/appointments")
          }
        >
          <ChevronLeft size={26} color={palette.primary} />
        </IconButton>
        <View>
          <Heading>{patient.name}</Heading>
          <Label style={{ fontSize: 12, color: palette.dark }}>
            Demo consultation · Video is not connected
          </Label>
        </View>
      </View>
      <View style={styles.stage}>
        <User size={30} color={palette.primary} />
        {ending && (
          <View style={styles.endPanel}>
            <Heading>End demo call?</Heading>
            <Label>Continue with clinical notes for {patient.name}.</Label>
            <Button
              theme="doctor"
              label="Continue to clinical notes"
              onPress={() => {
                setEnding(false);
                router.replace(visitRoute("clinical-notes", appointment));
              }}
            />
            <Button
              theme="doctor"
              variant="secondary"
              label="Stay in call"
              onPress={() => setEnding(false)}
            />
          </View>
        )}
      </View>
      <View style={styles.self}>
        <User size={26} color="white" />
        <Label style={{ color: "white", fontSize: 11 }}>
          {front ? "You" : "Back camera"}
          {muted ? " · Muted" : ""}
        </Label>
      </View>
      <View style={styles.controls}>
        <IconButton
          label="Switch camera preview"
          style={styles.control}
          onPress={() => setFront(!front)}
        >
          <SwitchCamera size={27} color="white" />
        </IconButton>
        <IconButton
          label={muted ? "Unmute microphone" : "Mute microphone"}
          style={[styles.control, muted && { backgroundColor: palette.dark }]}
          onPress={() => setMuted(!muted)}
        >
          {muted ? (
            <MicOff size={25} color="white" />
          ) : (
            <Mic size={25} color="white" />
          )}
        </IconButton>
        <IconButton
          label="Chat with patient"
          style={styles.control}
          onPress={() => router.push(visitRoute("chat", appointment))}
        >
          <MessageCircle size={25} color="white" />
        </IconButton>
        <IconButton
          label="End consultation call"
          style={[styles.control, { backgroundColor: palette.danger }]}
          onPress={() => setEnding(true)}
        >
          <PhoneOff size={26} color="white" />
        </IconButton>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#CFEDEA", padding: 16 },
  stage: { flex: 1, alignItems: "center", justifyContent: "center" },
  self: {
    width: 100,
    height: 132,
    backgroundColor: "#0A9E96",
    borderRadius: 26,
    alignSelf: "flex-end",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 32,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: 24,
    gap: 10,
  },
  control: {
    width: 58,
    height: 64,
    borderRadius: 25,
    backgroundColor: palette.primary,
  },
  endPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    padding: 20,
    gap: 14,
    borderRadius: 18,
    backgroundColor: "white",
  },
});
