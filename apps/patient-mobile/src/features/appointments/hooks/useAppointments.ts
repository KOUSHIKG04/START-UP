import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  issueClinicCheckinToken,
  listClinicAppointments,
  transitionClinicAppointment,
} from "@startup/data-access";
import type { ClinicAppointment } from "@startup/contracts";
import { useToast, useToastFeedback } from "@startup/mobile-ui";
import type {
  AppointmentsScreenProps,
  BookingFilter,
} from "../types/appointments";
import { supabase } from "../../../services/supabase";
export function useAppointments({ onBackPress }: AppointmentsScreenProps) {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<BookingFilter>("All");
  const [error, setError] = useState("");
  const [qr, setQr] = useState<{ appointmentId: string; token: string } | null>(
    null
  );
  const queryClient = useQueryClient();
  const appointments = useQuery<ClinicAppointment[]>({
    queryKey: ["patient-clinic-appointments"],
    queryFn: () => listClinicAppointments(supabase!),
    enabled: Boolean(supabase),
  });
  useToastFeedback({
    error:
      error ||
      (appointments.isError
        ? "Could not load bookings. Reopen this page to retry."
        : ""),
  });
  useEffect(() => {
    if (!qr) return;
    const timer = setTimeout(() => setQr(null), 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [qr]);
  const cancel = useMutation({
    mutationFn: (item: ClinicAppointment) =>
      transitionClinicAppointment(supabase!, {
        appointmentId: item.id,
        expectedVersion: Number(item.row_version),
        action: "cancel",
      }),
    onSuccess: () => {
      setError("");
      showToast({ title: "Booking cancelled", type: "success" });
      void queryClient.invalidateQueries({
        queryKey: ["patient-clinic-appointments"],
      });
    },
    onError: () =>
      setError("Could not cancel this booking. Refresh and try again."),
  });
  const issueQr = useMutation({
    mutationFn: async (appointmentId: string) => ({
      appointmentId,
      token: await issueClinicCheckinToken(supabase!, appointmentId),
    }),
    onSuccess: (result: { appointmentId: string; token: string }) => {
      setQr(result);
      setError("");
      showToast({
        title: "Check-in QR ready",
        message: "Show it to the clinic within five minutes.",
        type: "success",
      });
      void queryClient.invalidateQueries({
        queryKey: ["patient-clinic-appointments"],
      });
    },
    onError: () =>
      setError("Check-in QR is available on your clinic day. Try again then."),
  });
  const visible: ClinicAppointment[] =
    appointments.data?.filter(
      (item: ClinicAppointment) =>
        filter === "All" ||
        (filter === "Clinic Visit" && item.visit_mode === "clinic") ||
        (filter === "Online" && item.visit_mode === "online") ||
        (filter === "Home Visit" && item.visit_mode === "home")
    ) ?? [];

  return { filter, setFilter, qr, appointments, cancel, issueQr, visible };
}
