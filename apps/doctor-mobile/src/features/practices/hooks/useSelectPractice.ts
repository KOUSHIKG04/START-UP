import { useState } from "react";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyDoctorProfile, listMyPractices } from "@startup/data-access";
import { useToast, useToastFeedback } from "@startup/mobile-ui";
import { supabase, useMobileSession } from "../../../services/supabase";
import {
  getSelectedPracticeId,
  setSelectedPracticeId,
} from "../services/selectedPractice";
import { selectedPracticeQueryKey } from "../utils/practiceQueryKeys";
export function useSelectPractice() {
  const { profile } = useMobileSession();
  const doctorId = profile?.doctor?.id;
  const client = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const practices = useQuery({
    queryKey: ["my-practices"],
    queryFn: () => listMyPractices(supabase!),
    enabled: Boolean(supabase),
  });
  const doctorProfile = useQuery({
    queryKey: ["my-doctor-profile", doctorId],
    queryFn: () => getMyDoctorProfile(supabase!),
    enabled: Boolean(supabase && doctorId),
  });
  const selected = useQuery({
    queryKey: selectedPracticeQueryKey(doctorId),
    queryFn: () => getSelectedPracticeId(doctorId!),
    enabled: Boolean(doctorId),
  });

  useToastFeedback({
    error:
      practices.isError || doctorProfile.isError || selected.isError
        ? "Could not load your practice locations. Reopen this page to retry."
        : "",
  });

  const approved =
    practices.data?.filter((item) => item.is_clinician && item.verified) ?? [];

  const selectedId = approved.some((item) => item.practice_id === selected.data)
    ? selected.data
    : approved[0]?.practice_id;

  const loading =
    practices.isLoading || doctorProfile.isLoading || selected.isLoading;

  const locations = approved.map((practice) => ({
    ...practice,
    address:
      doctorProfile.data?.facilities.find(
        (item) => item.practice_id === practice.practice_id
      )?.address ?? "",
  }));

  const filtered = locations.filter((item) =>
    `${item.facility_name} ${item.address}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  async function choose(practiceId: string) {
    if (!doctorId || saving) return;
    setSaving(practiceId);
    try {
      await setSelectedPracticeId(doctorId, practiceId);
      client.setQueryData(selectedPracticeQueryKey(doctorId), practiceId);
      setSaving(null);
      router.back();
    } catch {
      setSaving(null);
      showToast({
        title: "Could not select practice",
        message: "Try again.",
        type: "error",
      });
    }
  }

  return {
    search,
    setSearch,
    saving,
    selected,
    approved,
    selectedId,
    loading,
    filtered,
    choose,
  };
}
