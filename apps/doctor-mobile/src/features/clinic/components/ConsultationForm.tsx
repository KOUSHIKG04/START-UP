import { useToastFeedback } from "@startup/mobile-ui";
import { useEffect, useState, type ReactNode } from "react";
import { BackHandler, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  issueConsultationPrescription,
  recommendConsultationFollowup,
  recordConsultationIntake,
  getDoctorConsultationDraft,
} from "@startup/data-access";
import {
  prescriptionMedicineSchema,
} from "@startup/contracts";
import type {
  IssuePrescriptionInput,
  RecordVitalInput,
} from "@startup/contracts";
import { Button, CalendarField, Input, Loader } from "@startup/mobile-ui";
import { supabase } from "../../../services/supabase";
import { DoctorScreen, Heading, Label } from "../../../components/DoctorScreen";

const vitalUnits: Record<RecordVitalInput["code"], string> = {
  temperature_c: "°C",
  pulse_bpm: "bpm",
  spo2_percent: "%",
  systolic_mmhg: "mmHg",
  diastolic_mmhg: "mmHg",
  weight_kg: "kg",
  height_cm: "cm",
};
const vitalLabels: Record<RecordVitalInput["code"], string> = {
  temperature_c: "Temperature",
  pulse_bpm: "Pulse",
  spo2_percent: "Oxygen saturation",
  systolic_mmhg: "Systolic blood pressure",
  diastolic_mmhg: "Diastolic blood pressure",
  weight_kg: "Weight",
  height_cm: "Height",
};

type Medicine = IssuePrescriptionInput["items"][number];
type DraftMedicine = Medicine & { draftId: string };
type Meal = Medicine["timings"][number]["meal_anchor"];
const meals: Meal[] = ["breakfast", "lunch", "dinner", "bedtime"];

type FlowProps = { appointmentId: string; patientName: string; timezone: string; assessmentStep: ReactNode; completing: boolean };
export function ConsultationForm(props: FlowProps) {
  const draft = useQuery({ queryKey: ["doctor-consultation-draft", props.appointmentId],
    queryFn: () => getDoctorConsultationDraft(supabase!, props.appointmentId), staleTime: 0 });
  if (!draft.data) return <DoctorScreen title="Consultation" bottomNav={false}>
    {draft.isError ? <><Label>Could not load the consultation.</Label><Button theme="doctor" label="Retry" onPress={() => void draft.refetch()} /></> : <Loader theme="doctor" />}
  </DoctorScreen>;
  return <ConsultationWizard key={props.appointmentId} {...props} initial={draft.data} />;
}

function ConsultationWizard({ appointmentId, patientName, timezone, assessmentStep, completing, initial }: FlowProps & { initial: Awaited<ReturnType<typeof getDoctorConsultationDraft>> }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(initial.followup ? 3 : initial.prescription_issued ? 2 : initial.vitals.length || initial.diagnosis ? 1 : 0);
  const [intakeSaved, setIntakeSaved] = useState(initial.vitals.length > 0 || Boolean(initial.diagnosis));
  const [prescriptionIssued, setPrescriptionIssued] = useState(initial.prescription_issued);
  const [followupSaved, setFollowupSaved] = useState(Boolean(initial.followup));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useToastFeedback({ error, success: message });
  const [vitalValues, setVitalValues] = useState<
    Partial<Record<RecordVitalInput["code"], string>>
  >(Object.fromEntries(initial.vitals.map(vital => [vital.code, String(vital.value)])));
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
  const [followupDate, setFollowupDate] = useState(initial.followup?.date ?? "");
  const [followupReason, setFollowupReason] = useState(initial.followup?.reason ?? "");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const tomorrow = new Date(Date.parse(`${today}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);

  const vital = useMutation({
    mutationFn: () => recordConsultationIntake(supabase!, {
        appointmentId,
        vitals: (Object.keys(vitalUnits) as RecordVitalInput["code"][]).filter(code => vitalValues[code]?.trim())
          .map(code => ({ code, value: Number(vitalValues[code]), unit: vitalUnits[code] })),
        diagnosis: diagnosis.trim() || null,
      }),
    onSuccess: () => {
      setIntakeSaved(true); setStep(1);
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["doctor-consultation-draft", appointmentId] });
    },
    onError: () =>
      setError("Could not save the vitals and diagnosis. Check the entered values and retry."),
  });

  const prescription = useMutation({
    mutationFn: () =>
      issueConsultationPrescription(supabase!, {
        appointmentId,
        items: items.map(({ draftId: _draftId, ...rest }) => rest),
        timezone,
      }),
    onSuccess: () => {
      setPrescriptionIssued(true); setStep(2);
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
      setFollowupSaved(true); setStep(3);
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

  const busy = vital.isPending || prescription.isPending || followup.isPending || completing;
  const back = () => { if (!busy) { setError(""); setMessage(""); setStep(current => Math.max(0, current - 1)); } };
  useEffect(() => {
    if (step === 0 && !busy) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!busy && step > 0) setStep(current => Math.max(0, current - 1));
      return true;
    });
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

  return (
    <DoctorScreen title={["Record vitals", "Prescription", "Follow-up", "Sign assessment"][step]} bottomNav={false}
      onBackPress={busy ? () => undefined : step > 0 ? back : undefined} scrollResetKey={step}>
    <Heading>{patientName}</Heading>
    <View style={styles.group}>
      {step === 0 ? <>
      {(Object.keys(vitalUnits) as RecordVitalInput["code"][]).map((code) => (
        <View key={code} style={styles.vitalRow}>
          <View style={styles.vitalInput}>
            <Input
              label={`${vitalLabels[code]} (${vitalUnits[code]})`}
              disabled={busy || intakeSaved}
              value={vitalValues[code] ?? ""}
              onChangeText={(value) =>
                setVitalValues((current) => ({ ...current, [code]: value }))
              }
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      ))}
      <Input
        label="Primary diagnosis"
        disabled={busy || intakeSaved}
        value={diagnosis}
        onChangeText={setDiagnosis}
        multiline
      />
      <Button
        theme="doctor"
        loading={vital.isPending}
        label={intakeSaved ? "Continue" : "Save and continue"}
        disabled={busy}
        onPress={() => {
          if (intakeSaved) { setStep(1); return; }
          if (!diagnosis.trim() && !Object.values(vitalValues).some(value => value?.trim())) { setStep(1); return; }
          vital.mutate();
        }}
      />
      </> : null}
      {step === 1 && !prescriptionIssued ? <>
      <Input
        label="Medicine name"
        value={medicineName}
        onChangeText={setMedicineName}
      />
      <Input label="Strength" value={strength} onChangeText={setStrength} />
      <Input label="Form" value={form} onChangeText={setForm} />
      <Input label="Route" value={route} onChangeText={setRoute} />
      <Input
        label="Instructions"
        value={instructions}
        onChangeText={setInstructions}
        multiline
      />
      <Input
        label="Dose quantity"
        value={doseQuantity}
        onChangeText={setDoseQuantity}
        keyboardType="decimal-pad"
      />
      <Input label="Dose unit" value={doseUnit} onChangeText={setDoseUnit} />
      <CalendarField theme="doctor"
        label="Start date"
        value={startsOn}
        minDate={today}
        disabled={prescription.isPending}
        onChange={(day) => {
          setStartsOn(day);
          if (endsOn && endsOn < day) setEndsOn("");
        }}
      />
      <CalendarField theme="doctor"
        label="End date"
        value={endsOn}
        minDate={startsOn || today}
        maxDate={startsOn ? new Date(Date.parse(`${startsOn}T12:00:00Z`) + 365 * 86400000).toISOString().slice(0, 10) : undefined}
        disabled={prescription.isPending}
        onChange={setEndsOn}
      />
      <Text>Daily times</Text>
      <View style={styles.wrap}>
        {meals.map((meal) => (
          <Button
            key={meal}
            label={meal}
            variant={selectedMeals.includes(meal) ? "primary" : "outline"}
            onPress={() =>
              setSelectedMeals((current) =>
                current.includes(meal)
                  ? current.filter((item) => item !== meal)
                  : [...current, meal]
              )
            }
          />
        ))}
      </View>
      <Text>Relative to meal</Text>
      <View style={styles.wrap}>
        {(["before", "with", "after", "independent"] as const).map(
          (relation) => (
            <Button
              key={relation}
              label={relation}
              variant={mealRelation === relation ? "primary" : "outline"}
              onPress={() => setMealRelation(relation)}
            />
          )
        )}
      </View>
      <Button
        label={items.length ? "Add another medicine" : "Add medicine to draft"}
        variant="outline"
        disabled={items.length >= 20}
        onPress={addMedicine}
      />
      {items.map((item, index) => (
        <View key={item.draftId} style={styles.draft}>
          <Text>
            {index + 1}. {item.medicine_name} {item.strength} ·{" "}
            {item.timings.map((timing) => timing.meal_anchor).join(", ")}
          </Text>
          <Button
            label="Remove"
            variant="outline"
            onPress={() =>
              setItems((current) =>
                current.filter((m) => m.draftId !== item.draftId)
              )
            }
          />
        </View>
      ))}
      <Button
        loading={prescription.isPending}
        theme="doctor"
        label="Sign prescription and continue"
        disabled={prescription.isPending || items.length === 0}
        onPress={() => prescription.mutate()}
      />
      {!items.length ? <Button theme="doctor" variant="outline" label="Continue without prescription" disabled={busy || Boolean(medicineName.trim())}
        onPress={() => { setError(""); setStep(2); }} /> : null}
      </> : null}
      {step === 1 && prescriptionIssued ? <><Label>Prescription signed and saved.</Label><Button theme="doctor" label="Continue" onPress={() => setStep(2)} /></> : null}
      {step === 2 ? <>
      <CalendarField theme="doctor"
        label="Follow-up date"
        value={followupDate}
        minDate={tomorrow}
        disabled={busy || followupSaved}
        onChange={setFollowupDate}
      />
      <Input
        label="Reason"
        value={followupReason}
        disabled={busy || followupSaved}
        onChangeText={setFollowupReason}
        multiline
      />
      <Button
        loading={followup.isPending}
        theme="doctor"
        label={followupSaved ? "Continue" : "Save and continue"}
        disabled={
          followup.isPending ||
          (!followupSaved && (!followupDate || followupReason.trim().length < 2))
        }
        onPress={() => {
          if (followupSaved) { setStep(3); return; }
          followup.mutate();
        }}
      />
      {!followupSaved ? <Button theme="doctor" variant="outline" label="No follow-up needed" disabled={busy || Boolean(followupDate || followupReason.trim())}
        onPress={() => { setError(""); setStep(3); }} /> : null}
      </> : null}
      {step === 3 ? assessmentStep : null}
      {step > 0 ? <Button theme="doctor" variant="outline" label="Back" disabled={busy} onPress={back} /> : null}
    </View>
    </DoctorScreen>
  );
}

const styles = StyleSheet.create({
  group: { gap: 10, marginTop: 8 },
  heading: { fontSize: 18, fontWeight: "600", marginTop: 12 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  vitalRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  vitalInput: { flex: 1 },
  draft: {
    borderWidth: 1,
    borderColor: "#D8E4E8",
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  error: { color: "#B42318" },
});
