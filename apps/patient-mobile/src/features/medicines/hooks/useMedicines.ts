import { useQuery } from "@tanstack/react-query";
import { listMyClinicalRecords } from "@startup/data-access";
import type { ClinicalRecord } from "@startup/contracts";
import { useToastFeedback } from "@startup/mobile-ui";
import type { MedicinesScreenProps } from "../types/medicines";
import { supabase } from "../../../services/supabase";

export function useMedicines({
  appointmentId,
  onBackPress,
}: MedicinesScreenProps) {
  const clinicalRecords = useQuery({
    queryKey: ["my-clinical-records"],
    queryFn: () => listMyClinicalRecords(supabase!),
    enabled: Boolean(supabase),
  });
  useToastFeedback({
    error: clinicalRecords.isError
      ? "Could not load medications. Please retry."
      : "",
  });

  const records = clinicalRecords.data ?? [];
  const record: ClinicalRecord | undefined = appointmentId
    ? records.find(
        (r) =>
          r.appointment_id === appointmentId ||
          r.appointment_code === appointmentId
      )
    : records[0];

  const primaryDiagnosis =
    record?.diagnoses.find((d) => d.is_primary)?.description ??
    record?.diagnoses[0]?.description ??
    "Diagnosis not recorded";

  return { clinicalRecords, record, primaryDiagnosis };
}
