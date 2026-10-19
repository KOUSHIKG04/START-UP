import { styles } from "./OnlineConsultation.styles";
import { useDemoOnlineConsultation } from "../hooks/useDemoOnlineConsultation";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  ChevronLeft,
  MessageCircle,
  MicOff,
  Mic,
  SwitchCamera,
  PhoneOff,
  User,
} from "lucide-react-native";
import { Button } from "@startup/mobile-ui";
import {
  Heading,
  IconButton,
  Label,
  MissingPatient,
} from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";
import { visitRoute } from "../utils/consultationRoutes";
export function DemoOnlineConsultation() {
  const {
    patient,
    appointment,
    muted,
    setMuted,
    front,
    setFront,
    ending,
    setEnding,
  } = useDemoOnlineConsultation();
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
        <Heading>{patient.name}</Heading>
      </View>
      <View style={styles.stage}>
        <User size={30} color={palette.primary} />
        <Label>Demo consultation Ã‚Â· Video is not connected</Label>
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
          {muted ? " Ã‚Â· Muted" : ""}
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
