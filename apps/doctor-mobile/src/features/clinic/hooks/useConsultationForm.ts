import { useToastFeedback } from "@startup/mobile-ui";
import { useEffect, useState } from "react";
import { BackHandler } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  issueConsultationPrescription,
  recommendConsultationFollowup,
  recordConsultationIntake,
  getDoctorConsultationDraft,
} from "@startup/data-access";
import { prescriptionMedicineSchema } from "@startup/contracts";
import type { RecordVitalInput } from "@startup/contracts";
import { supabase } from "../../../services/supabase";
import type {
  Medicine,
  DraftMedicine,
  Meal,
  FlowProps,
} from "../types/consultation";
import { vitalUnits } from "../utils/consultationConstants";

export function useConsultationForm({
  appointmentId,
  patientName,
  timezone,
  assessmentStep,
  completing,
  initial,
}: FlowProps & {
  initial: Awaited<ReturnType<typeof getDoctorConsultationDraft>>;
}) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(
    initial.followup
      ? 3
      : initial.prescription_issued
        ? 2
        : initial.vitals.length || initial.diagnosis
          ? 1
          : 0
  );
  const [intakeSaved, setIntakeSaved] = useState(
    initial.vitals.length > 0 || Boolean(initial.diagnosis)
  );
  const [prescriptionIssued, setPrescriptionIssued] = useState(
    initial.prescription_issued
  );
  const [followupSaved, setFollowupSaved] = useState(Boolean(initial.followup));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useToastFeedback({ error, success: message });
  const [vitalValues, setVitalValues] = useState<
    Partial<Record<RecordVitalInput["code"], string>>
  >(
    Object.fromEntries(
      initial.vitals.map((vital) => [vital.code, String(vital.value)])
    )
  );
  const [diagnosis, setDiagnosis] = useState(initial.diagnosis ?? "");
  const [medicineName, setMedicineName] = useState("");
  const [strength, setStrength] = useState("");
  const [form, setForm] = useState("");
  const [route, setRoute] = useState("oral");
  const [instructions, setInstructions] = useState("");
  const [doseQuantity, setDoseQuantity] = useState("1");
  const [doseUnit, setDoseUnit] = useState("tablet");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [selectedMeals, setSelectedMeals] = useState<Meal[]>(["breakfast"]);
  const [mealRelation, setMealRelation] =
    useState<Medicine["timings"][number]["meal_relation"]>("after");
  const [items, setItems] = useState<DraftMedicine[]>([]);
  const [followupDate, setFollowupDate] = useState(
    initial.followup?.date ?? ""
  );
  const [followupReason, setFollowupReason] = useState(
    initial.followup?.reason ?? ""
  );
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const tomorrow = new Date(Date.parse(`${today}T12:00:00Z`) + 86400000)
    .toISOString()
    .slice(0, 10);
  const vital = useMutation({
    mutationFn: () =>
      recordConsultationIntake(supabase!, {
        appointmentId,
        vitals: (Object.keys(vitalUnits) as RecordVitalInput["code"][])
          .filter((code) => vitalValues[code]?.trim())
          .map((code) => ({
            code,
            value: Number(vitalValues[code]),
            unit: vitalUnits[code],
          })),
        diagnosis: diagnosis.trim() || null,
      }),
    onSuccess: () => {
      setIntakeSaved(true);
      setStep(1);
      setError("");
      void queryClient.invalidateQueries({
        queryKey: ["doctor-consultation-draft", appointmentId],
      });
    },
    onError: () =>
      setError(
        "Could not save the vitals and diagnosis. Check the entered values and retry."
      ),
  });
  const prescription = useMutation({
    mutationFn: () =>
      issueConsultationPrescription(supabase!, {
        appointmentId,
        items: items.map(({ draftId: _draftId, ...rest }) => rest),
        timezone,
      }),
    onSuccess: () => {
      setPrescriptionIssued(true);
      setStep(2);
      setError("");
      setMessage("Prescription signed and saved.");
      void queryClient.invalidateQueries({
        queryKey: ["doctor-consultation-draft", appointmentId],
      });
    },
    onError: () =>
      setError(
        "Could not issue the prescription. Check its dates and whether one already exists."
      ),
  });
  const followup = useMutation({
    mutationFn: () =>
      recommendConsultationFollowup(supabase!, {
        appointmentId,
        date: followupDate,
        timezone,
        reason: followupReason,
      }),
    onSuccess: () => {
      setFollowupSaved(true);
      setStep(3);
      setError("");
      setMessage("Follow-up recommendation saved. It is not a booking.");
      void queryClient.invalidateQueries({
        queryKey: ["doctor-consultation-draft", appointmentId],
      });
    },
    onError: () =>
      setError(
        "Could not save the follow-up. Check the future date and try again."
      ),
  });
  const busy =
    vital.isPending ||
    prescription.isPending ||
    followup.isPending ||
    completing;
  const back = () => {
    if (!busy) {
      setError("");
      setMessage("");
      setStep((current) => Math.max(0, current - 1));
    }
  };
  useEffect(() => {
    if (step === 0 && !busy) return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (!busy && step > 0) setStep((current) => Math.max(0, current - 1));
        return true;
      }
    );
    return () => subscription.remove();
  }, [step, busy]);
  function addMedicine() {
    const parsed = prescriptionMedicineSchema.safeParse({
      medicine_name: medicineName,
      strength,
      form,
      route,
      instructions,
      dose_quantity: Number(doseQuantity),
      dose_unit: doseUnit,
      starts_on: startsOn,
      ends_on: endsOn,
      timings: selectedMeals.map((meal_anchor) => ({
        meal_anchor,
        meal_relation: mealRelation,
      })),
    });
    if (!parsed.success || parsed.data.ends_on < parsed.data.starts_on) {
      setError(
        "Complete the medicine details, valid dates, and at least one daily time."
      );
      return;
    }
    setItems((current) => [
      ...current,
      { ...parsed.data, draftId: `${Date.now()}-${current.length}` },
    ]);
    setMedicineName("");
    setStrength("");
    setForm("");
    setInstructions("");
    setError("");
    setMessage(
      "Medicine added to draft. Sign the prescription when all medicines are ready."
    );
  }
  return {
    step,
    setStep,
    intakeSaved,
    prescriptionIssued,
    followupSaved,
    setError,
    vitalValues,
    setVitalValues,
    diagnosis,
    setDiagnosis,
    medicineName,
    setMedicineName,
    strength,
    setStrength,
    form,
    setForm,
    route,
    setRoute,
    instructions,
    setInstructions,
    doseQuantity,
    setDoseQuantity,
    doseUnit,
    setDoseUnit,
    startsOn,
    setStartsOn,
    endsOn,
    setEndsOn,
    selectedMeals,
    setSelectedMeals,
    mealRelation,
    setMealRelation,
    items,
    setItems,
    followupDate,
    setFollowupDate,
    followupReason,
    setFollowupReason,
    today,
    tomorrow,
    vital,
    prescription,
    followup,
    busy,
    back,
    addMedicine,
  };
}
