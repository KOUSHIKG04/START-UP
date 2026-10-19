import type { LiveOnlineConsultationProps } from "../types/live-online-consultation";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AudioSession } from "@livekit/react-native";
import {
  getOnlineVideoToken,
  startOnlineAppointment,
} from "@startup/data-access";
import { useToast, useToastFeedback } from "@startup/mobile-ui";
import { useOnlineVisit } from "./useOnlineVisit";
import { supabase } from "../../../services/supabase";
export function useLiveOnlineConsultation({
  appointmentId,
  initialChat,
}: LiveOnlineConsultationProps) {
  const { showToast } = useToast();
  const live = useOnlineVisit(appointmentId);
  const queryClient = useQueryClient();
  const start = useMutation({
    mutationFn: () => startOnlineAppointment(supabase!, appointmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["doctor-clinic-appointments"],
      });
    },
  });
  const token = useQuery({
    queryKey: ["online-video-token", appointmentId],
    queryFn: () => getOnlineVideoToken(supabase!, appointmentId),
    enabled: Boolean(
      live.appointment &&
      live.appointment.status === "in_consultation" &&
      supabase
    ),
    staleTime: 5 * 60 * 1000,
  });
  useToastFeedback({
    error: start.isError
      ? "Could not start consultation. Check its scheduled time and status."
      : token.error instanceof Error
        ? token.error.message
        : "",
  });
  useEffect(() => {
    if (!token.data) return;
    void AudioSession.startAudioSession().catch(() =>
      showToast({
        title: "Audio unavailable",
        message: "Check microphone permissions.",
        type: "error",
      })
    );
    return () => {
      void AudioSession.stopAudioSession().catch(() => undefined);
    };
  }, [token.data, showToast]);
  const appointment = live.appointment;

  return { showToast, live, start, token, appointment };
}
