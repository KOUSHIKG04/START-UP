import { useState } from "react";
import * as Crypto from "expo-crypto";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  decideAppointmentRecovery,
  listAppointmentRescheduleOptions,
  rescheduleAppointment,
  resolveAppointmentAttendance,
} from "@startup/data-access";
import type { ClinicAppointment } from "@startup/contracts";
import { useToast } from "@startup/mobile-ui";
import { supabase } from "../../../services/supabase";

export type RecoveryIntent =
  "reschedule" | "no_show" | "doctor_unavailable" | "approve" | "reject";

export function useAppointmentRecovery(
  item: ClinicAppointment,
  intent: RecoveryIntent,
  onClose: () => void
) {
  const [key] = useState(() => Crypto.randomUUID());
  const client = useQueryClient();
  const { showToast } = useToast();
  const times = useQuery({
    queryKey: ["doctor-reschedule-options", item.id],
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
    }) => {
      if (intent === "reschedule")
        return rescheduleAppointment(supabase!, {
          appointmentId: item.id,
          expectedVersion: Number(item.row_version),
          targetWindowId,
          reason,
          idempotencyKey: key,
        });
      if (intent === "approve" || intent === "reject") {
        const request = item.recovery?.request;
        if (!request || request.status !== "pending")
          throw new Error("Request changed; refresh and retry.");
        return decideAppointmentRecovery(supabase!, {
          requestId: request.id,
          expectedVersion: Number(request.row_version),
          approve: intent === "approve",
          note: reason,
        });
      }
      return resolveAppointmentAttendance(supabase!, {
        appointmentId: item.id,
        expectedVersion: Number(item.row_version),
        outcome: intent,
        note: reason,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["doctor-clinic-appointments"] }),
        client.invalidateQueries({ queryKey: ["clinic-slots"] }),
        client.invalidateQueries({ queryKey: ["doctor-reschedule-options"] }),
      ]);
      showToast({ title: "Appointment updated", type: "success" });
      onClose();
    },
    onError: () => {
      void client.invalidateQueries({
        queryKey: ["doctor-clinic-appointments"],
      });
    },
  });
  return { times, mutation };
}
