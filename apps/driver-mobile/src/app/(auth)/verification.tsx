import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  getMyDriverRegistrationApplication,
  getMyVerificationCase,
} from "@startup/data-access";
import { VerificationScreen } from "../../features/auth/screens/RegistrationScreens";
import {
  mobileSession,
  supabase,
  useMobileSession,
} from "../../services/supabase";

export default function DriverVerification() {
  const { profile, session } = useMobileSession();
  
  const application = useQuery({
    queryKey: ["driver-registration-application"],
    queryFn: () => getMyDriverRegistrationApplication(supabase!),
    enabled: Boolean(session && supabase),
    refetchOnMount: "always",
    refetchInterval: 15000,
  });

  const review = useQuery({
    queryKey: ["my-driver-verification", application.data?.id],
    queryFn: () =>
      getMyVerificationCase(supabase!, "driver", application.data!.id),
    enabled: Boolean(supabase && application.data?.id),
    refetchInterval: 15000,
  });

  useEffect(() => {
    const timer = setInterval(() => void mobileSession.refresh(), 15000);
    return () => clearInterval(timer);
  }, []);
  if (application.isLoading)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );

  if (application.error)
    return (
      <View style={{ padding: 24 }}>
        <Text accessibilityRole="alert">
          Could not load verification status.
        </Text>
      </View>
    );
    
  return (
    <VerificationScreen
      verified={profile?.driver?.status === "verified"}
      rejectionReason={
        review.data?.documents
          .filter((document) => document.status === "rejected")
          .map(
            (document) =>
              `${document.kind.replaceAll("_", " ")}: ${document.rejection_reason}`
          )
          .join("\n") ?? null
      }
      onBack={() =>
        router.push(
          review.data?.status === "needs_resubmission"
            ? "/documents"
            : "/details"
        )
      }
      onDashboard={() => router.replace("/(app)")}
    />
  );
}
