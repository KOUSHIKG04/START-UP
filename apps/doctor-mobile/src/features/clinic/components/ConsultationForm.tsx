import { useToastFeedback } from "@startup/mobile-ui";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  issueConsultationPrescription,
  recommendConsultationFollowup,
  recordConsultationDiagnosis,
  recordConsultationVital,
} from "@startup/data-access";
import { parseDisplayDate, prescriptionMedicineSchema } from "@startup/contracts";
import type {
  IssuePrescriptionInput,
  RecordVitalInput,
} from "@startup/contracts";
import { Button, Input } from "@startup/mobile-ui";
import { supabase } from "../../../services/supabase";

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

export function ConsultationForm({ appointmentId }: { appointmentId: string }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useToastFeedback({ error, success: message });
  const [vitalValues, setVitalValues] = useState<Partial<Record<RecordVitalInput["code"], string>>>({});
  const [diagnosis, setDiagnosis] = useState("");
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
  const [followupDate, setFollowupDate] = useState("");
  const [followupReason, setFollowupReason] = useState("");
  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";

  const vital = useMutation({
    mutationFn: (code: RecordVitalInput["code"]) =>
      recordConsultationVital(supabase!, {
        appointmentId,
        code,
        value: Number(vitalValues[code]),
        unit: vitalUnits[code],
      }),
    onSuccess: (_result: unknown, code: RecordVitalInput["code"]) => {
      setVitalValues((current) => ({ ...current, [code]: "" }));
      setError("");
      setMessage(`${vitalLabels[code]} saved.`);
      void queryClient.invalidateQueries({ queryKey: ["doctor-clinic-appointments"] });
    },
    onError: () =>
      setError("Could not save this vital. Check the value and try again."),
  });
  const diagnosisMutation = useMutation({
    mutationFn: () =>
      recordConsultationDiagnosis(supabase!, {
        appointmentId,
        description: diagnosis,
        isPrimary: true,
      }),
    onSuccess: () => {
      setDiagnosis("");
      setError("");
      setMessage("Primary diagnosis saved.");
      void queryClient.invalidateQueries({ queryKey: ["doctor-clinic-appointments"] });
    },
    onError: () =>
      setError(
        "Could not save the diagnosis. A primary diagnosis may already exist."
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
      setItems([]);
      setError("");
      setMessage("Prescription signed and saved.");
      void queryClient.invalidateQueries({ queryKey: ["doctor-clinic-appointments"] });
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
        date: parseDisplayDate(followupDate) ?? followupDate,
        timezone,
        reason: followupReason,
      }),
    onSuccess: () => {
      setFollowupDate("");
      setFollowupReason("");
      setError("");
      setMessage("Follow-up recommendation saved. It is not a booking.");
      void queryClient.invalidateQueries({ queryKey: ["doctor-clinic-appointments"] });
    },
    onError: () =>
      setError(
        "Could not save the follow-up. Check the future date and try again."
      ),
  });

  function addMedicine() {
    const parsed = prescriptionMedicineSchema.safeParse({
      medicine_name: medicineName,
      strength,
      form,
      route,
      instructions,
      dose_quantity: Number(doseQuantity),
      dose_unit: doseUnit,
      starts_on: parseDisplayDate(startsOn) ?? startsOn,
      ends_on: parseDisplayDate(endsOn) ?? endsOn,
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
    <View style={styles.group}>
      <Text style={styles.heading}>Consultation details</Text>
      <Text>Record vitals and diagnosis before signing the assessment.</Text>
      {(Object.keys(vitalUnits) as RecordVitalInput["code"][]).map((code) => (
        <View key={code} style={styles.vitalRow}>
          <View style={styles.vitalInput}>
            <Input
              label={`${vitalLabels[code]} (${vitalUnits[code]})`}
              value={vitalValues[code] ?? ""}
              onChangeText={(value) => setVitalValues((current) => ({ ...current, [code]: value }))}
              keyboardType="decimal-pad"
            />
          </View>
          <Button loading={vital.isPending && vital.variables === code}
            label="Save"
            variant="outline"
            disabled={vital.isPending || !Number.isFinite(Number(vitalValues[code])) || Number(vitalValues[code]) <= 0}
            onPress={() => vital.mutate(code)}
          />
        </View>
      ))}
      <Input
        label="Primary diagnosis"
        value={diagnosis}
        onChangeText={setDiagnosis}
        multiline
      />
      <Button loading={diagnosisMutation.isPending}
        label="Save primary diagnosis"
        variant="outline"
        disabled={diagnosisMutation.isPending || diagnosis.trim().length < 2}
        onPress={() => diagnosisMutation.mutate()}
      />

      <Text style={styles.heading}>Prescription</Text>
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
      <Input
        label="Start date (DD-MM-YYYY)"
        value={startsOn}
        onChangeText={setStartsOn}
      />
      <Input
        label="End date (DD-MM-YYYY)"
        value={endsOn}
        onChangeText={setEndsOn}
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
      <Button loading={prescription.isPending}
        label={`Sign prescription (${items.length} ${items.length === 1 ? "medicine" : "medicines"})`}
        disabled={prescription.isPending || items.length === 0}
        onPress={() => prescription.mutate()}
      />

      <Text style={styles.heading}>Follow-up</Text>
      <Input
        label="Suggested date (DD-MM-YYYY)"
        value={followupDate}
        onChangeText={setFollowupDate}
      />
      <Input
        label="Reason"
        value={followupReason}
        onChangeText={setFollowupReason}
        multiline
      />
      <Button loading={followup.isPending}
        label="Recommend follow-up"
        variant="outline"
        disabled={
          followup.isPending ||
          !followupDate ||
          followupReason.trim().length < 2
        }
        onPress={() => {
          if (!parseDisplayDate(followupDate)) {
            setError("Enter the follow-up date as DD-MM-YYYY.");
            return;
          }
          followup.mutate();
        }}
      />

    </View>
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
