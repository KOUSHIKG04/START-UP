import { filters } from "../utils/unavailableTimeConstants";
import type { Scope } from "../types/unavailable-time-manager";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useToast } from "@startup/mobile-ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addClinicUnavailability,
  getMyDoctorProfile,
  listClinicUnavailability,
  listMyPractices,
  revokeClinicUnavailability,
} from "@startup/data-access";
import {
  type ClinicUnavailability,
  type ClinicPractice,
} from "@startup/contracts";
import { supabase, useMobileSession } from "../../../services/supabase";
import {
  getSelectedPracticeId,
  setSelectedPracticeId,
} from "../../practices/services/selectedPractice";
import { selectedPracticeQueryKey } from "../../practices/utils/practiceQueryKeys";
import { practiceTimeIso } from "../utils/unavailableTime";
export function useUnavailableTimeManager() {
  const client = useQueryClient();
  const { showToast } = useToast();
  const { profile } = useMobileSession();
  const doctorId = profile?.doctor?.id;
  const practices = useQuery({
    queryKey: ["my-practices"],
    queryFn: () => listMyPractices(supabase!),
    enabled: Boolean(supabase),
  });
  const doctor = useQuery({
    queryKey: ["my-doctor-profile"],
    queryFn: () => getMyDoctorProfile(supabase!),
    enabled: Boolean(supabase),
  });
  const preferred = useQuery({
    queryKey: selectedPracticeQueryKey(doctorId),
    queryFn: () => getSelectedPracticeId(doctorId!),
    enabled: Boolean(doctorId),
  });
  const availablePractices = practices.data as ClinicPractice[] | undefined;
  const [practice, setPractice] = useState<string | null>(null);
  const practiceId =
    availablePractices?.find((p) => p.practice_id === practice)?.practice_id ??
    availablePractices?.find((p) => p.practice_id === preferred.data)
      ?.practice_id ??
    availablePractices?.[0]?.practice_id;
  const unavailable = useQuery({
    queryKey: ["doctor-clinic-unavailability", practiceId],
    queryFn: () => listClinicUnavailability(supabase!, practiceId!),
    enabled: Boolean(supabase && practiceId),
  });
  useFocusEffect(
    useCallback(() => {
      void client.invalidateQueries({
        queryKey: ["doctor-clinic-unavailability"],
      });
    }, [client])
  );
  const [scopes, setScopes] = useState<Scope[]>(["all"]);
  function toggleScope(value: Scope) {
    setScopes((current) => {
      if (value === "all") return ["all"];
      const next = current.filter((item) => item !== "all");
      const chosen = next.includes(value)
        ? next.filter((item) => item !== value)
        : [...next, value];
      return chosen.length === 0 || chosen.length === 3 ? ["all"] : chosen;
    });
  }
  const scopeLabel = scopes.includes("all")
    ? "all services"
    : filters
        .filter(([value]) => scopes.includes(value))
        .map(([, label]) => label)
        .join(" and ");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const zone = doctor.data?.booking_timezone;
  const busy = pending !== null;
  async function refresh() {
    await Promise.all([
      client.invalidateQueries({
        queryKey: ["doctor-clinic-unavailability", practiceId],
      }),
      client.invalidateQueries({
        queryKey: ["doctor-clinic-sessions", practiceId],
      }),
    ]);
  }
  async function add() {
    if (!supabase || !practiceId || !zone || busy) return;
    setPending("add-leave");
    try {
      const day = date;
      if (!day) throw new Error("Choose a date.");
      const startsAt = practiceTimeIso(day, start, zone);
      const endsAt = practiceTimeIso(day, end, zone);
      if (endsAt <= startsAt)
        throw new Error("End time must be after start time.");
      await addClinicUnavailability(supabase, {
        practiceId,
        startsAt,
        endsAt,
        reason,
        serviceModes: scopes,
      });
      await refresh();
      setDate("");
      setStart("");
      setEnd("");
      setReason("");
      showToast({ title: "Unavailable time saved", type: "success" });
    } catch (cause) {
      showToast({
        title: "Could not add unavailable time",
        message: cause instanceof Error ? cause.message : "Try again.",
        type: "error",
      });
    } finally {
      setPending(null);
    }
  }
  async function remove(item: ClinicUnavailability) {
    if (!supabase || busy) return;
    setPending(`remove-leave:${item.id}`);
    try {
      await revokeClinicUnavailability(supabase, {
        exceptionId: item.id,
        expectedVersion: Number(item.row_version),
      });
      await refresh();
    } catch (cause) {
      showToast({
        title: "Could not remove unavailable time",
        message:
          cause instanceof Error ? cause.message : "Refresh and try again.",
        type: "error",
      });
    } finally {
      setPending(null);
    }
  }

  function selectPractice(p: ClinicPractice) {
    setPractice(p.practice_id);
    if (doctorId)
      void setSelectedPracticeId(doctorId, p.practice_id)
        .then(() =>
          client.setQueryData(selectedPracticeQueryKey(doctorId), p.practice_id)
        )
        .catch(() =>
          showToast({
            title: "Could not remember clinic",
            type: "error",
          })
        );
  }
  return {
    selectPractice,
    client,
    showToast,
    doctorId,
    practices,
    doctor,
    availablePractices,
    setPractice,
    practiceId,
    unavailable,
    scopes,
    toggleScope,
    scopeLabel,
    date,
    setDate,
    start,
    setStart,
    end,
    setEnd,
    reason,
    setReason,
    pending,
    zone,
    busy,
    add,
    remove,
  };
}
