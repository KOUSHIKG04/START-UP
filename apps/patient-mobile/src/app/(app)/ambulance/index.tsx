import { router } from "expo-router";
import { useCallback } from "react";
import { AmbulanceBookingScreen } from "../../../features/ambulance/screens/AmbulanceBookingScreen";

export default function AmbulanceRoute() {
  const handleFullscreenChange = useCallback((fullscreen: boolean) => {
    router.setParams({ fullscreen: fullscreen ? "true" : "false" });
  }, []);
  return <AmbulanceBookingScreen onBackPress={() => router.back()} onComplete={() => router.replace("/")} onFullscreenChange={handleFullscreenChange} />;
}
