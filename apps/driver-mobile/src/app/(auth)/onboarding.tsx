import { View } from "react-native";
import { Button, Loader, useToastFeedback } from "@startup/mobile-ui";
import { Redirect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getMyDriverRegistrationApplication } from "@startup/data-access";
import { supabase, useMobileSession } from "../../services/supabase";

export default function OnboardingRoute() {
  const { session, profile, loading, error } = useMobileSession();
  const application = useQuery({
    queryKey: ["driver-registration-application"],
    queryFn: () => getMyDriverRegistrationApplication(supabase!),
    enabled: Boolean(session && supabase && !profile?.driver),
  });

  useToastFeedback({
    error: application.isError
      ? "Could not load your registration. Retry to check its status."
      : "",
  });
  if (loading || error)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Loader theme="driver" />
      </View>
    );
  if (!session) return <Redirect href="/login" />;
  if (profile?.driver) return <Redirect href="/(app)" />;

  if (application.isLoading)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Loader theme="driver" size="large" />
      </View>
    );

  if (application.isError)
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <Button
          theme="driver"
          label="Retry registration status"
          loading={application.isFetching}
          onPress={() => {
            void application.refetch();
          }}
        />
      </View>
    );
  if (!application.isSuccess)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Loader theme="driver" />
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
