import { Redirect, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { listMyAmbulanceFleet } from "@startup/data-access";
import { VerificationScreen } from "../../features/auth/screens/RegistrationScreens";
import { supabase, useMobileSession } from "../../services/supabase";

export default function DriverVerified() {
  const { profile } = useMobileSession();
  const fleet = useQuery({
    queryKey: ["driver-fleet", profile?.driver?.id],
    queryFn: () => listMyAmbulanceFleet(supabase!),
    enabled: Boolean(supabase && profile?.driver?.id),
  });
  if (fleet.isLoading) return null;
  if (
    profile?.driver?.status !== "verified" ||
    !fleet.data?.some((vehicle) => vehicle.ready_to_go_available)
  )
    return <Redirect href="/(app)/verification" />;
  return (
    <VerificationScreen
      verified
      onBack={() => router.back()}
      onDashboard={() => router.replace("/(app)/(tabs)/home")}
    />
  );
}
