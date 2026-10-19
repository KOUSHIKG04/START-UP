import * as Crypto from "expo-crypto";
import { sendOnlineMessage } from "@startup/data-access";
import { supabase } from "../../../services/supabase";
import type { MessageItem } from "../types/chat-screen";
import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listOnlineMessages,
  subscribeOnlineMessages,
} from "@startup/data-access";
import { FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVisit } from "./useVisit";
import { useDoctorStore } from "../../../stores/useDoctorStore";
import { useMobileSession } from "../../../services/supabase";
import { useOnlineVisit } from "./useOnlineVisit";
export function useLegacyConsultationChat() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const live = useOnlineVisit(appointmentId);
  const { profile } = useMobileSession();
  const queryClient = useQueryClient();
  const [sendError, setSendError] = useState("");
  const liveMessages = useQuery({
    queryKey: ["online-messages", appointmentId],
    queryFn: () => listOnlineMessages(supabase!, appointmentId!),
    enabled: Boolean(live.appointment && supabase),
  });
  useEffect(() => {
    if (!live.appointment || !supabase || !appointmentId) return;
    return subscribeOnlineMessages(supabase, appointmentId, () => {
      void queryClient.invalidateQueries({
        queryKey: ["online-messages", appointmentId],
      });
    });
  }, [live.appointment?.id, appointmentId, queryClient]);
  const { patient, appointment } = useVisit();
  const messages = useDoctorStore((s) => s.messages);
  const sendMessage = useDoctorStore((s) => s.sendMessage);
  const [draft, setDraft] = useState("");
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<MessageItem>>(null);

  const send = async () => {
    if (!draft.trim()) return;
    if (live.appointment && supabase) {
      try {
        await sendOnlineMessage(
          supabase,
          live.appointment.id,
          draft,
          Crypto.randomUUID()
        );
        setDraft("");
        setSendError("");
        await queryClient.invalidateQueries({
          queryKey: ["online-messages", appointmentId],
        });
      } catch (cause) {
        setSendError(
          cause instanceof Error ? cause.message : "Message could not be sent."
        );
      }
    } else if (appointment) {
      sendMessage(appointment.id, draft.trim());
      setDraft("");
    }
  };
  return {
    send,
    appointmentId,
    live,
    profile,
    queryClient,
    sendError,
    setSendError,
    liveMessages,
    patient,
    appointment,
    messages,
    sendMessage,
    draft,
    setDraft,
    insets,
    flatListRef,
  };
}
