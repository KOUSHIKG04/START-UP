import { useCallback, useEffect, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listMyPracticeAppointments,
  transitionClinicAppointment,
} from "@startup/data-access";
import type { ClinicAppointment } from "@startup/contracts";
import { useToast } from "@startup/mobile-ui";
import { supabase } from "../../../services/supabase";
import type { Action } from "../types/appointment-actions";

export function useAppointmentReview() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  const appointments = useQuery({
    queryKey: ["doctor-clinic-appointments", "all"],
    queryFn: () => listMyPracticeAppointments(supabase!),
    enabled: Boolean(supabase),
  });
  useFocusEffect(
    useCallback(() => {
      void appointments.refetch();
    }, [appointments.refetch])
  );
  const item = appointments.data?.find((entry) => entry.id === appointmentId);
  const expired = Boolean(
    item?.status === "pending" &&
    (Date.parse(item.request_expires_at ?? item.starts_at) <= now ||
      Date.parse(item.starts_at) <= now)
  );
  const transition = useMutation({
    mutationFn: async ({
      item,
      action,
    }: {
      item: ClinicAppointment;
      action: Action;
    }) => {
      let current = item;
      if (action === "start" && item.queue_state === "waiting") {
        await transitionClinicAppointment(supabase!, {
          appointmentId: item.id,
          expectedVersion: Number(item.row_version),
          action: "call",
        });
        const updated = (await listMyPracticeAppointments(supabase!)).find(
          (entry) => entry.id === item.id
        );
        if (!updated)
          throw new Error(
            "Could not load the updated appointment. Refresh and retry."
          );
        current = updated;
      }
      return transitionClinicAppointment(supabase!, {
        appointmentId: item.id,
        expectedVersion: Number(current.row_version),
        action,
        note: ["reject", "hold", "complete"].includes(action)
          ? (notes[item.id]?.trim() ?? null)
          : null,
      });
    },
    onSuccess: (_result, { action, item }) => {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
      const feedback =
        action === "approve"
          ? "Appointment confirmed."
          : "Appointment updated.";
      showToast({ title: feedback, type: "success" });
      void queryClient.invalidateQueries({
        queryKey: ["doctor-clinic-appointments"],
      });
      void queryClient.invalidateQueries({ queryKey: ["my-notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["clinic-slots"] });
      if (action === "start")
        router.push({
          pathname: "/clinical-notes",
          params: {
            appointmentId: item.id,
            patientId: item.patient_id,
            mode: item.visit_mode,
          },
        });
    },
    onError: (cause) => {
      const message =
        cause && typeof cause === "object" && "message" in cause
          ? String(cause.message)
          : "";
      const feedback = message.includes("Request expired")
        ? "This request has expired or its slot is no longer available. Ask the patient to book a new time."
        : message.includes("Appointment changed")
          ? "This appointment was updated elsewhere. Its latest status is being loaded; review it before trying again."
          : message || "Could not update the appointment. Please try again.";
      void appointments.refetch();
      showToast({ title: "Update failed", message: feedback, type: "error" });
    },
  });
  const act = (item: ClinicAppointment, action: Action) => {
    if (
      action === "approve" &&
      (Date.parse(item.request_expires_at ?? item.starts_at) <= Date.now() ||
        Date.parse(item.starts_at) <= Date.now())
    ) {
      setNow(Date.now());
      showToast({
        title: "Request expired",
        message: "Ask the patient to book a new available time.",
        type: "info",
      });
      return;
    }
    return transition.mutate({ item, action });
  };
  return {
    appointmentId,
    now,
    notes,
    setNotes,
    appointments,
    item,
    expired,
    transition,
    act,
  };
}
