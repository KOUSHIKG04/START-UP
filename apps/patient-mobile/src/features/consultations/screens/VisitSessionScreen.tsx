import { getTitle } from "../utils/visitSession";
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

import type { VisitSessionScreenProps } from "../types/visit-session";

export function VisitSessionScreen({
  appointment,
  mode,
  onBackPress,
  onGoHome,
  onViewMedicines,
  onViewPrescription,
  onRealComplete,
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
          onComplete={onRealComplete ?? (() => setCompleted(true))}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Header title={getTitle(mode)} app="patient" onBackPress={onBackPress} />
      {mode === "clinic-check-in" ? (
        <ClinicVisitFlow
          appointment={appointment}
          onComplete={onRealComplete ?? (() => setCompleted(true))}
        />
      ) : (
        <HomeVisitFlow
          appointment={appointment}
          onComplete={() => setCompleted(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
});
