import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { listMyAmbulanceFleet } from "@startup/data-access";
import { VerificationScreen } from "../../features/auth/screens/RegistrationScreens";
import {
  mobileSession,
  supabase,
  useMobileSession,
} from "../../services/supabase";

export default function DriverVerification() {
  const { profile } = useMobileSession();
  const fleet = useQuery({
    queryKey: ["driver-fleet", profile?.driver?.id],
    queryFn: () => listMyAmbulanceFleet(supabase!),
    enabled: Boolean(supabase && profile?.driver?.id),
    refetchInterval: 15000,
  });

  useEffect(() => {
    const timer = setInterval(() => void mobileSession.refresh(), 15000);
    return () => clearInterval(timer);
  }, []);

  if (fleet.isLoading)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );

  const verified =
    profile?.driver?.status === "verified" &&
    Boolean(fleet.data?.some((vehicle) => vehicle.ready_to_go_available));
  
    return (
    <VerificationScreen
      verified={verified}
      onBack={() => router.back()}
      onDashboard={() => router.replace("/(app)/(tabs)/home")}
    />
  );
}
