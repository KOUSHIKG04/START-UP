import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeOnlineAppointment,
  listMyPracticeAppointments,
  transitionClinicAppointment,
} from "@startup/data-access";
import { uuidSchema } from "@startup/contracts";
import { useVisit } from "./useVisit";
import { useDoctorStore } from "../../../stores/useDoctorStore";
import { supabase } from "../../../services/supabase";
export function useClinicalNotes() {
  const params = useLocalSearchParams<{
    appointmentId?: string;
    patientId?: string;
    mode?: string;
  }>();

  const isLiveAppointment = Boolean(
    params.appointmentId && uuidSchema.safeParse(params.appointmentId).success
  );

  const queryClient = useQueryClient();
  const appointmentsQuery = useQuery({
    queryKey: ["doctor-clinic-appointments", "all"],
    queryFn: () => listMyPracticeAppointments(supabase!),
    enabled: Boolean(supabase && isLiveAppointment),
  });

  const liveAppointment = appointmentsQuery.data?.find(
    (item) => item.id === params.appointmentId
  );

  const [assessment, setAssessment] = useState("");
  const [completeMessage, setCompleteMessage] = useState("");

  const completeMutation = useMutation({
    mutationFn: () =>
      liveAppointment?.visit_mode === "online"
        ? completeOnlineAppointment(
            supabase!,
            liveAppointment.id,
            assessment.trim()
          )
        : transitionClinicAppointment(supabase!, {
            appointmentId: liveAppointment!.id,
            expectedVersion: Number(liveAppointment!.row_version),
            action: "complete",
            note: assessment.trim() || null,
          }),
    onSuccess: () => {
      setCompleteMessage("Consultation signed and completed.");
      void queryClient.invalidateQueries({
        queryKey: ["doctor-clinic-appointments"],
      });
    },
    onError: () => {
      setCompleteMessage(
        "Could not complete consultation. Check current status."
      );
    },
  });

  // Demo fallback
  const { patient, appointment } = useVisit();
  const visits = useDoctorStore((s) => s.consultations);
  const update = useDoctorStore((s) => s.updateConsultation);
  const complete = useDoctorStore((s) => s.complete);
  const [confirm, setConfirm] = useState(false);

  return {
    isLiveAppointment,
    appointmentsQuery,
    liveAppointment,
    assessment,
    setAssessment,
    completeMessage,
    completeMutation,
    patient,
    appointment,
    visits,
    update,
    complete,
    confirm,
    setConfirm,
  };
}
