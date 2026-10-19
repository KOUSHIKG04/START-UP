import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { listMyClinicalRecords } from "@startup/data-access";
import { useToastFeedback } from "@startup/mobile-ui";
import { supabase } from "../../../services/supabase";
import type { RecordsScreenProps } from "../types/records";
export function useRecords({ onBackPress, onViewRecord }: RecordsScreenProps) {
  const records = useQuery({
    queryKey: ["my-clinical-records"],
    queryFn: () => listMyClinicalRecords(supabase!),
    enabled: Boolean(supabase),
  });
  useFocusEffect(
    useCallback(() => {
      if (supabase) void records.refetch();
    }, [records.refetch])
  );
  useToastFeedback({ error: records.isError ? "Could not load records." : "" });

  return { records };
}
