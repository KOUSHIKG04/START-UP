import { useEffect, useState } from "react";
import { BackHandler } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  getMyPatientProfileDetail,
  listClinicAppointments,
  listMyFamilyProfiles,
  listMyNotifications,
} from "@startup/data-access";
import { useToastFeedback, useToast } from "@startup/mobile-ui";
import { supabase, useMobileSession } from "../../../services/supabase";
import type { ProfileScreenProps } from "../types/profile";

export function usePatientProfile({ onBackPress }: ProfileScreenProps) {
  const { showToast } = useToast();
  const { profile } = useMobileSession();
  const detail = useQuery({
    queryKey: ["my-patient-profile-detail", profile?.patient_id],
    queryFn: () => getMyPatientProfileDetail(supabase!),
    enabled: Boolean(supabase && profile?.patient_id),
  });
  const profilePhoto = useQuery({
    queryKey: ["my-patient-profile-photo", detail.data?.profile_photo_path],
    queryFn: async () => {
      const { data, error } = await supabase!.storage
        .from("patient-profile-photos")
        .createSignedUrl(detail.data!.profile_photo_path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    enabled: Boolean(supabase && detail.data?.profile_photo_path),
    staleTime: 30 * 60 * 1000,
  });
  const family = useQuery({
    queryKey: ["my-family-profiles", profile?.patient_id],
    queryFn: () => listMyFamilyProfiles(supabase!),
    enabled: Boolean(supabase && profile?.patient_id),
  });
  useToastFeedback({
    error: family.isError ? "Family profiles are unavailable right now." : "",
  });
  const bookings = useQuery({
    queryKey: ["patient-clinic-appointments"],
    queryFn: () => listClinicAppointments(supabase!),
    enabled: Boolean(supabase && profile?.patient_id),
  });
  const notifications = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => listMyNotifications(supabase!),
    enabled: Boolean(supabase && profile?.patient_id),
  });
  const unreadCount =
    notifications.data?.filter((item) => !item.is_read).length ?? 0;
  useToastFeedback({
    error: detail.isError
      ? "Could not load your profile. Use Retry profile to try again."
      : bookings.isError
        ? "Your bookings are unavailable right now."
        : "",
  });
  const name =
    detail.data?.full_name ?? profile?.display_name ?? "Your profile";
  const [currentView, setCurrentView] = useState<"profile" | "settings">(
    "profile"
  );
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  // Hardware back button handling
  useEffect(() => {
    const onHardwareBack = () => {
      if (currentView === "settings") {
        setCurrentView("profile");
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener(
      "hardwareBackPress",
      onHardwareBack
    );
    return () => sub.remove();
  }, [currentView]);

  return {
    showToast,
    detail,
    profilePhoto,
    family,
    unreadCount,
    name,
    currentView,
    setCurrentView,
    notificationsOpen,
    setNotificationsOpen,
  };
}
