import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import {
  listAppointmentRescheduleOptions,
  requestAppointmentReview,
  rescheduleAppointment,
} from "@startup/data-access";
import type { ClinicAppointment } from "@startup/contracts";
import { useToast } from "@startup/mobile-ui";
import { supabase } from "../../../services/supabase";

export function useAppointmentRecovery(
  item: ClinicAppointment,
  intent: "reschedule" | "review",
  onClose: () => void
) {
  const [key] = useState(() => Crypto.randomUUID());
  const client = useQueryClient();
  const { showToast } = useToast();
  const times = useQuery({
    queryKey: ["appointment-reschedule-options", item.id],
    queryFn: () => listAppointmentRescheduleOptions(supabase!, item.id),
    enabled: intent === "reschedule",
    staleTime: 0,
  });
  const mutation = useMutation({
    mutationFn: async ({
      targetWindowId,
      reason,
    }: {
      targetWindowId: string;
      reason: string;
    }) =>
      intent === "review"
        ? (await requestAppointmentReview(supabase!, {
            appointmentId: item.id,
            expectedVersion: Number(item.row_version),
            reason,
          }),
          { kind: "requested" })
        : rescheduleAppointment(supabase!, {
            appointmentId: item.id,
            expectedVersion: Number(item.row_version),
            targetWindowId,
            reason,
            idempotencyKey: key,
          }),
    onSuccess: async (result) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["patient-clinic-appointments"] }),
        client.invalidateQueries({ queryKey: ["clinic-slots"] }),
        client.invalidateQueries({
          queryKey: ["appointment-reschedule-options"],
        }),
      ]);
      showToast({
        title:
          result.kind === "rescheduled"
            ? "Appointment rescheduled"
            : "Request sent to the clinic",
        type: "success",
      });
      onClose();
    },
    onError: () => {
      void client.invalidateQueries({
        queryKey: ["patient-clinic-appointments"],
      });
    },
  });
  return { times, mutation };
}
