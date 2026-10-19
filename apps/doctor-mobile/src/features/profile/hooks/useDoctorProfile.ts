import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToastFeedback } from "@startup/mobile-ui";
import { useQuery } from "@tanstack/react-query";
import {
  getMyDoctorPersonalAddress,
  getMyDoctorProfile,
} from "@startup/data-access";
import { supabase, useMobileSession } from "../../../services/supabase";
export function useDoctorProfile() {
  const insets = useSafeAreaInsets();
  const { session, profile: sessionProfile } = useMobileSession();
  const profile = useQuery({
    queryKey: ["my-doctor-profile", sessionProfile?.doctor?.id],
    queryFn: () => getMyDoctorProfile(supabase!),
    enabled: Boolean(supabase && sessionProfile?.doctor?.id),
  });
  const personalAddress = useQuery({
    queryKey: ["my-doctor-personal-address", sessionProfile?.doctor?.id],
    queryFn: () => getMyDoctorPersonalAddress(supabase!),
    enabled: Boolean(supabase && sessionProfile?.doctor?.id),
  });
  useToastFeedback({
    error: profile.isError
      ? "Could not load your doctor profile. Please try again."
      : "",
  });
  const profilePhotoUrl =
    profile.data?.profile_photo_path && supabase
      ? supabase.storage
          .from("provider-profile-photos")
          .getPublicUrl(profile.data.profile_photo_path).data.publicUrl
      : null;
  const name =
    profile.data?.full_name ?? sessionProfile?.display_name ?? "Doctor";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return {
    insets,
    session,
    profile,
    personalAddress,
    profilePhotoUrl,
    name,
    initials,
  };
}
