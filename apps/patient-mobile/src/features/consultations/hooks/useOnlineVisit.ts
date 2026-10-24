import type { OnlineVisitFlowProps } from "../types/visit-session";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { AudioSession } from "@livekit/react-native";
import { uuidSchema, type ClinicAppointment } from "@startup/contracts";
import {
  getOnlineJoinContext,
  getOnlineVideoToken,
  listClinicAppointments,
} from "@startup/data-access";
import { useToast, useToastFeedback } from "@startup/mobile-ui";
import { supabase } from "../../../services/supabase";

export function useOnlineVisit({
  appointment,
  initialChat,
  onBackPress,
  onComplete,
}: OnlineVisitFlowProps) {
  const appointmentId = appointment.backendId;
  const live = uuidSchema.safeParse(appointmentId).success;
  const completionShown = useRef(false);
  const leaving = useRef(false);
  const { showToast } = useToast();
  const appointmentStatus = useQuery({
    queryKey: ["patient-clinic-appointments"],
    queryFn: () => listClinicAppointments(supabase!),
    enabled: Boolean(live && supabase),
  });
  const activeAppointment = appointmentStatus.data?.find(
    (item: ClinicAppointment) => item.id === appointmentId
  );
  useEffect(() => {
    if (activeAppointment?.status !== "completed" || completionShown.current)
      return;
    completionShown.current = true;
    onComplete();
  }, [activeAppointment?.status, onComplete]);
  const context = useQuery({
    queryKey: ["online-context", appointmentId],
    queryFn: () => getOnlineJoinContext(supabase!, appointmentId!),
    enabled: Boolean(live && supabase),
  });
  const token = useQuery({
    queryKey: ["online-video-token", appointmentId],
    queryFn: () => getOnlineVideoToken(supabase!, appointmentId!),
    enabled: Boolean(context.data && supabase),
    staleTime: 5 * 60 * 1000,
  });
  useToastFeedback({
    error:
      token.error instanceof Error
        ? token.error.message
        : context.isError
          ? "Could not load this consultation."
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
  async function leave() {
    if (leaving.current) return;
    leaving.current = true;
    try {
      const latest = await listClinicAppointments(supabase!);
      if (
        latest.some(
          (item) => item.id === appointmentId && item.status === "completed"
        )
      ) {
        if (!completionShown.current) {
          completionShown.current = true;
          onComplete();
        }
      } else onBackPress();
    } catch {
      onBackPress();
    } finally {
      leaving.current = false;
    }
  }

  return {
    appointmentId,
    live,
    showToast,
    activeAppointment,
    context,
    token,
    leave,
  };
}
