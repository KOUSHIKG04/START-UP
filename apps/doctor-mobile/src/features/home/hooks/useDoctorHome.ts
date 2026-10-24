import { useTimeGreeting } from "@startup/mobile-ui";
import { useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyDoctorPresence,
  getMyDoctorProfile,
  listMyPracticeAppointments,
  listMyDoctorLocations,
  setMyDoctorPresence,
} from "@startup/data-access";
import { useToastFeedback } from "@startup/mobile-ui";
import { supabase, useMobileSession } from "../../../services/supabase";

export function useDoctorHome() {
  const greeting = useTimeGreeting();
  const insets = useSafeAreaInsets();
  const { profile } = useMobileSession();
  const [showNotifications, setShowNotifications] = useState(false);
  const [presenceError, setPresenceError] = useState("");
  const presenceBusyRef = useRef(false);
  const client = useQueryClient();
  const locations = useQuery({
    queryKey: ["my-doctor-locations", profile?.doctor?.id],
    queryFn: () => listMyDoctorLocations(supabase!),
    enabled: Boolean(supabase && profile?.doctor?.id),
  });
  const selectedLocation = locations.data?.find((item) => item.selected);
  useToastFeedback({
    error: locations.isError
      ? "Could not load saved locations. Tap the location to retry."
      : "",
  });
  const doctorProfile = useQuery({
    queryKey: ["my-doctor-profile", profile?.doctor?.id],
    queryFn: () => getMyDoctorProfile(supabase!),
    enabled: Boolean(supabase && profile?.doctor?.id),
  });
  const appointments = useQuery({
    queryKey: ["doctor-clinic-appointments", "all"],
    queryFn: () => listMyPracticeAppointments(supabase!),
    enabled: Boolean(supabase),
  });
  const presence = useQuery({
    queryKey: ["my-doctor-presence"],
    queryFn: () => getMyDoctorPresence(supabase!),
    enabled: Boolean(supabase && profile?.doctor?.id),
  });

  const today = new Date().toDateString();
  const todayAppointments =
    appointments.data?.filter(
      (item) =>
        new Date(item.starts_at).toDateString() === today &&
        !["cancelled", "rejected"].includes(item.status)
    ) ?? [];
  const waiting = todayAppointments.filter(
    (item) => item.queue_state === "waiting" || item.queue_state === "called"
  ).length;
  const pendingRequests = (appointments.data ?? []).filter(
    (item) =>
      item.status === "pending" &&
      Date.parse(item.request_expires_at ?? item.starts_at) > Date.now() &&
      Date.parse(item.starts_at) > Date.now()
  );
  const homeAppointments = [
    ...pendingRequests,
    ...todayAppointments.filter(
      (item) => !pendingRequests.some((request) => request.id === item.id)
    ),
  ];
  async function changePresence(value: boolean) {
    if (!supabase || presenceBusyRef.current) return;
    presenceBusyRef.current = true;
    setPresenceError("");
    try {
      await setMyDoctorPresence(supabase, value);
      await client.invalidateQueries({ queryKey: ["my-doctor-presence"] });
    } catch (cause) {
      setPresenceError(
        cause instanceof Error
          ? cause.message
          : "Could not update your presence."
      );
    } finally {
      presenceBusyRef.current = false;
    }
  }

  return {
    greeting,
    insets,
    showNotifications,
    setShowNotifications,
    presenceError,
    selectedLocation,
    doctorProfile,
    appointments,
    presence,
    todayAppointments,
    waiting,
    pendingRequests,
    homeAppointments,
    changePresence,
  };
}
