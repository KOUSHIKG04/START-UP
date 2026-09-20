import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "@startup/design-tokens";
import { Header, SafeAreaView } from "@startup/mobile-ui";
import {
  ClinicVisitFlow,
  CompletionView,
  HomeVisitFlow,
  OnlineVisitFlow,
} from "../components/index";
import type { VisitSessionMode } from "../../appointments/types/appointment";
import type { VisitSessionScreenProps } from "../types/visit-session";

export function VisitSessionScreen({
  appointment,
  mode,
  onBackPress,
  onGoHome,
  onViewMedicines,
  onViewPrescription,
}: VisitSessionScreenProps) {
  const [completed, setCompleted] = useState(false);

  if (completed) {
    return (
      <SafeAreaView edges={["top"]} style={styles.screen}>
        <CompletionView
          appointment={appointment}
          onGoHome={onGoHome}
          onViewMedicines={onViewMedicines}
          onViewPrescription={onViewPrescription}
        />
      </SafeAreaView>
    );
  }

  if (mode === "online-chat" || mode === "online-video") {
    return (
      <View style={styles.screen}>
        <OnlineVisitFlow
          appointment={appointment}
          initialChat={mode === "online-chat"}
          onBackPress={onBackPress}
          onComplete={() => setCompleted(true)}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Header
        title={getTitle(mode)}
        app="patient"
        onBackPress={onBackPress}
      />
      {mode === "clinic-check-in" ? (
        <ClinicVisitFlow appointment={appointment} onComplete={() => setCompleted(true)} />
      ) : (
        <HomeVisitFlow appointment={appointment} onComplete={() => setCompleted(true)} />
      )}
    </View>
  );
}

function getTitle(mode: VisitSessionMode) {
  if (mode === "clinic-check-in") return "Hospital Visit";
  if (mode === "home-tracking") return "Home Visit";
  return mode === "online-chat" ? "Secure Care Chat" : "Video Consultation";
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
});
