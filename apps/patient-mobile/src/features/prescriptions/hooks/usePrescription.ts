import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { formatDisplayDate } from "@startup/contracts";
import { Share } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { listMyClinicalRecords } from "@startup/data-access";
import type { ClinicalRecord } from "@startup/contracts";
import { useToastFeedback } from "@startup/mobile-ui";
import type { PrescriptionScreenProps } from "../types/prescription";
import { supabase } from "../../../services/supabase";
export function usePrescription({
  appointment,
  appointmentId,
  onBackPress,
  onViewMedicines,
}: PrescriptionScreenProps) {
  const [downloaded, setDownloaded] = useState(false);

  const clinicalRecords = useQuery({
    queryKey: ["my-clinical-records"],
    queryFn: () => listMyClinicalRecords(supabase!),
    enabled: Boolean(supabase),
  });
  useFocusEffect(
    useCallback(() => {
      if (supabase) void clinicalRecords.refetch();
    }, [clinicalRecords.refetch])
  );
  useToastFeedback({
    error: clinicalRecords.isError
      ? "Could not load prescriptions. Please retry."
      : "",
  });

  const records = clinicalRecords.data ?? [];
  const targetId = appointmentId ?? appointment?.id;
  const record: ClinicalRecord | undefined = targetId
    ? records.find(
        (r: ClinicalRecord) =>
          r.appointment_id === targetId || r.appointment_code === targetId
      )
    : records[0];

  const primaryDiagnosis =
    record?.diagnoses.find((d) => d.is_primary)?.description ??
    record?.diagnoses[0]?.description ??
    "General consultation";

  const sharePrescription = () => {
    if (!record) return;
    const medList = record.medicines
      .map(
        (m, i) =>
          `${i + 1}. ${m.medicine_name} ${m.strength} - ${m.instructions || "as prescribed"}`
      )
      .join("\n");
    Share.share({
      message: `Prescription #${record.prescription_code ?? "not issued"}\nDoctor: ${record.doctor_name} (${record.facility_name})\nDiagnosis: ${primaryDiagnosis}\n\nMedicines:\n${medList}\n\n${record.assessment ? `Advice: ${record.assessment}` : ""}`,
    });
  };

  const formatDate = (isoString?: string | null) => {
    return formatDisplayDate(isoString ?? new Date());
  };

  return {
    downloaded,
    setDownloaded,
    clinicalRecords,
    record,
    primaryDiagnosis,
    sharePrescription,
    formatDate,
  };
}
