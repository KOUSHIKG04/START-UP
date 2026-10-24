import { useCallback } from "react";
import { setStatusBarStyle } from "expo-status-bar";
import { useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { listMyFamilyProfiles } from "@startup/data-access";
import { supabase, useMobileSession } from "../../../services/supabase";

export function useFamilyMembers() {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("dark");
    }, [])
  );
  const { profile } = useMobileSession();

  const familyQuery = useQuery({
    queryKey: ["my-family-profiles", profile?.patient_id],
    queryFn: () => listMyFamilyProfiles(supabase!),
    enabled: Boolean(supabase && profile?.patient_id),
  });

  const familyMembers = familyQuery.data ?? [];

  return { familyMembers };
}
