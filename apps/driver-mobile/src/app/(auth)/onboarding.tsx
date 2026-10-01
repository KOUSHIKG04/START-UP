import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getMyDriverRegistrationApplication } from "@startup/data-access";
import { supabase, useMobileSession } from "../../services/supabase";

export default function OnboardingRoute() {
  const { session, profile } = useMobileSession();
  const application = useQuery({
    queryKey: ["driver-registration-application"],
    queryFn: () => getMyDriverRegistrationApplication(supabase!),
    enabled: Boolean(session && supabase && !profile?.driver),
  });

  if (!session) return <Redirect href="/login" />;
  if (profile?.driver) return <Redirect href="/(app)" />;
  
  if (application.isLoading)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );

  if (
    application.data?.status === "submitted" ||
    application.data?.status === "approved"
  )
    return <Redirect href="/verification" />;
  
    if (application.data?.status === "details_saved")
    return <Redirect href="/documents" />;
    
  return <Redirect href="/details" />;
}
