import { LiveOnlineConsultation } from "../components/LiveOnlineConsultation";
import { DemoOnlineConsultation } from "../components/DemoOnlineConsultation";

import type { OnlineConsultationScreenProps } from "../types/online-consultation-screen";

import { useLocalSearchParams } from "expo-router";

import { registerGlobals } from "@livekit/react-native";

import { useOnlineVisit } from "../hooks/useOnlineVisit";

registerGlobals();

export function OnlineConsultationScreen({
  initialChat = false,
}: OnlineConsultationScreenProps = {}) {
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const live = useOnlineVisit(appointmentId);
  if (live.isLive)
    return (
      <LiveOnlineConsultation
        appointmentId={appointmentId!}
        initialChat={initialChat}
      />
    );
  return <DemoOnlineConsultation />;
}
