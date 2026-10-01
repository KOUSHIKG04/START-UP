import { ActivityIndicator, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getMyDriverProfile, listMyAmbulanceFleet } from "@startup/data-access";
import { supabase, useMobileSession } from "../../services/supabase";

export default function DriverAppIndex() {
  const { profile } = useMobileSession();
  const personal = useQuery({
    queryKey: ["my-driver-profile"],
    queryFn: () => getMyDriverProfile(supabase!),
    enabled: Boolean(supabase && profile?.driver?.id),
  });
  const fleet = useQuery({
    queryKey: ["driver-fleet", profile?.driver?.id],
    queryFn: () => listMyAmbulanceFleet(supabase!),
    enabled: Boolean(supabase && profile?.driver?.id),
  });
  if (personal.isLoading || fleet.isLoading)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  if (personal.error || fleet.error)
    return (
      <View style={{ padding: 24 }}>
        <Text accessibilityRole="alert">
          Could not load your driver status. Check your connection and reopen
          the app.
        </Text>
      </View>
    );
  if (
    !personal.data?.date_of_birth ||
    !personal.data?.city ||
    !personal.data?.verification_consent_at
  )
    return <Redirect href="/(app)/edit-profile" />;
  if (fleet.data?.length === 0) return <Redirect href="/(app)/documents" />;
  if (
    profile?.driver?.status !== "verified" ||
    !fleet.data?.some((vehicle) => vehicle.ready_to_go_available)
  )
    return <Redirect href="/(app)/verification" />;
  return <Redirect href="/(app)/verified" />;
}
