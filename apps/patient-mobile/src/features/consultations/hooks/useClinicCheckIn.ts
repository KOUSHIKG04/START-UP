import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { uuidSchema } from "@startup/contracts";
import {
  issueClinicCheckinToken,
  listClinicAppointments,
} from "@startup/data-access";
import { supabase } from "../../../services/supabase";
import { isClinicDay } from "../../appointments/utils/clinicVisit";

export function useClinicCheckIn(appointmentId?: string) {
  const [focused, setFocused] = useState(false);
  const [qr, setQr] = useState<{
    appointmentId: string;
    token: string;
    expiresAt: number;
  } | null>(null);
  const [now, setNow] = useState(Date.now());
  const requested = useRef<string | null>(null);
  useEffect(() => {
    if (!qr) return;
    const timer = setTimeout(
      () => {
        setQr(null);
        setNow(Date.now());
      },
      Math.max(0, qr.expiresAt - Date.now())
    );
    return () => clearTimeout(timer);
  }, [qr]);
  const live = uuidSchema.safeParse(appointmentId).success;
  const appointments = useQuery({
    queryKey: ["patient-clinic-appointments"],
    queryFn: () => listClinicAppointments(supabase!),
    enabled: Boolean(live && supabase),
    refetchInterval: focused ? 15000 : false,
  });
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      setNow(Date.now());
      if (live && supabase) void appointments.refetch();
      return () => setFocused(false);
    }, [live, appointments.refetch])
  );
  useEffect(() => {
    if (!focused) return;
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, [focused]);
  const item = appointments.data?.find(
    (entry) => entry.id === appointmentId && entry.visit_mode === "clinic"
  );
  const canShowQr = Boolean(
    item &&
    item.status === "confirmed" &&
    item.queue_state === "awaiting_arrival" &&
    isClinicDay(item, new Date(now))
  );
  const issueQr = useMutation({
    mutationFn: async (id: string) => {
      const expiresAt = Date.now() + 5 * 60 * 1000;
      const token = await issueClinicCheckinToken(supabase!, id);
      return { appointmentId: id, token, expiresAt };
    },
    retry: false,
    onSuccess: (result) => setQr(result),
  });
  const issue = issueQr.mutate;
  useEffect(() => {
    if (
      !focused ||
      !canShowQr ||
      !appointmentId ||
      requested.current === appointmentId
    )
      return;
    requested.current = appointmentId;
    issue(appointmentId);
  }, [focused, canShowQr, appointmentId, issue]);

  return {
    live,
    item,
    appointments,
    canShowQr,
    qr:
      canShowQr &&
      qr &&
      qr.appointmentId === appointmentId &&
      qr.expiresAt > now
        ? qr.token
        : null,
    issueQr,
    refreshQr: () => {
      if (focused && canShowQr && appointmentId && !issueQr.isPending)
        issue(appointmentId);
    },
  };
}
