import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { issueConsultationPrescription, recommendConsultationFollowup, recordConsultationDiagnosis, recordConsultationVital } from "@startup/data-access";
import { prescriptionMedicineSchema } from "@startup/contracts";
import type { IssuePrescriptionInput, RecordVitalInput } from "@startup/contracts";
import { Button, Input } from "@startup/mobile-ui";
import { supabase } from "../../../services/supabase";

const vitalUnits: Record<RecordVitalInput["code"], string> = {
  temperature_c: "°C", pulse_bpm: "bpm", spo2_percent: "%", systolic_mmhg: "mmHg",
  diastolic_mmhg: "mmHg", weight_kg: "kg", height_cm: "cm",
};

type Medicine = IssuePrescriptionInput["items"][number];
type Meal = Medicine["timings"][number]["meal_anchor"];
const meals: Meal[] = ["breakfast", "lunch", "dinner", "bedtime"];

export function ConsultationForm({ appointmentId }: { appointmentId: string }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [vitalCode, setVitalCode] = useState<RecordVitalInput["code"]>("temperature_c");
  const [vitalValue, setVitalValue] = useState("");
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
  const [mealRelation, setMealRelation] = useState<Medicine["timings"][number]["meal_relation"]>("after");
  const [items, setItems] = useState<Medicine[]>([]);
  const [followupDate, setFollowupDate] = useState("");
  const [followupReason, setFollowupReason] = useState("");
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";

  const vital = useMutation({
    mutationFn: () => recordConsultationVital(supabase!, { appointmentId, code: vitalCode, value: Number(vitalValue), unit: vitalUnits[vitalCode] }),
    onSuccess: () => { setVitalValue(""); setError(""); setMessage("Vital saved."); },
    onError: () => setError("Could not save this vital. Check the value and try again."),
  });
  const diagnosisMutation = useMutation({
    mutationFn: () => recordConsultationDiagnosis(supabase!, { appointmentId, description: diagnosis, isPrimary: true }),
    onSuccess: () => { setDiagnosis(""); setError(""); setMessage("Primary diagnosis saved."); },
    onError: () => setError("Could not save the diagnosis. A primary diagnosis may already exist."),
  });
  const prescription = useMutation({
    mutationFn: () => issueConsultationPrescription(supabase!, { appointmentId, items, timezone }),
    onSuccess: () => { setItems([]); setError(""); setMessage("Prescription signed and saved."); },
    onError: () => setError("Could not issue the prescription. Check its dates and whether one already exists."),
  });
  const followup = useMutation({
    mutationFn: () => recommendConsultationFollowup(supabase!, { appointmentId, date: followupDate, timezone, reason: followupReason }),
    onSuccess: () => { setFollowupDate(""); setFollowupReason(""); setError(""); setMessage("Follow-up recommendation saved. It is not a booking."); },
    onError: () => setError("Could not save the follow-up. Check the future date and try again."),
  });

  function addMedicine() {
    const parsed = prescriptionMedicineSchema.safeParse({
      medicine_name: medicineName, strength, form, route, instructions,
      dose_quantity: Number(doseQuantity), dose_unit: doseUnit, starts_on: startsOn, ends_on: endsOn,
      timings: selectedMeals.map((meal_anchor) => ({ meal_anchor, meal_relation: mealRelation })),
    });
    if (!parsed.success || parsed.data.ends_on < parsed.data.starts_on) {
      setError("Complete the medicine details, valid dates, and at least one daily time.");
      return;
    }
    setItems((current) => [...current, parsed.data]);
    setMedicineName(""); setStrength(""); setForm(""); setInstructions(""); setError("");
    setMessage("Medicine added to draft. Sign the prescription when all medicines are ready.");
  }

  return <View style={styles.group}>
    <Text style={styles.heading}>Consultation details</Text>
    <Text>Record vitals and diagnosis before signing the assessment.</Text>
    <View style={styles.wrap}>{(Object.keys(vitalUnits) as RecordVitalInput["code"][]).map((code) =>
      <Button key={code} label={code.replaceAll("_", " ")} variant={vitalCode === code ? "primary" : "outline"} onPress={() => setVitalCode(code)} />)}</View>
    <Input label={`Vital value (${vitalUnits[vitalCode]})`} value={vitalValue} onChangeText={setVitalValue} keyboardType="decimal-pad" />
    <Button label="Save vital" variant="outline" disabled={vital.isPending || !Number.isFinite(Number(vitalValue)) || Number(vitalValue) <= 0} onPress={() => vital.mutate()} />
    <Input label="Primary diagnosis" value={diagnosis} onChangeText={setDiagnosis} multiline />
    <Button label="Save primary diagnosis" variant="outline" disabled={diagnosisMutation.isPending || diagnosis.trim().length < 2} onPress={() => diagnosisMutation.mutate()} />

    <Text style={styles.heading}>Prescription</Text>
    <Input label="Medicine name" value={medicineName} onChangeText={setMedicineName} />
    <Input label="Strength" value={strength} onChangeText={setStrength} />
    <Input label="Form" value={form} onChangeText={setForm} />
    <Input label="Route" value={route} onChangeText={setRoute} />
    <Input label="Instructions" value={instructions} onChangeText={setInstructions} multiline />
    <Input label="Dose quantity" value={doseQuantity} onChangeText={setDoseQuantity} keyboardType="decimal-pad" />
    <Input label="Dose unit" value={doseUnit} onChangeText={setDoseUnit} />
    <Input label="Start date (YYYY-MM-DD)" value={startsOn} onChangeText={setStartsOn} />
    <Input label="End date (YYYY-MM-DD)" value={endsOn} onChangeText={setEndsOn} />
    <Text>Daily times</Text>
    <View style={styles.wrap}>{meals.map((meal) => <Button key={meal} label={meal} variant={selectedMeals.includes(meal) ? "primary" : "outline"}
      onPress={() => setSelectedMeals((current) => current.includes(meal) ? current.filter((item) => item !== meal) : [...current, meal])} />)}</View>
    <Text>Relative to meal</Text>
    <View style={styles.wrap}>{(["before", "with", "after", "independent"] as const).map((relation) => <Button key={relation} label={relation}
      variant={mealRelation === relation ? "primary" : "outline"} onPress={() => setMealRelation(relation)} />)}</View>
    <Button label="Add medicine to draft" variant="outline" onPress={addMedicine} />
    {items.map((item, index) => <View key={`${item.medicine_name}-${index}`} style={styles.draft}>
      <Text>{item.medicine_name} {item.strength} · {item.timings.map((timing) => timing.meal_anchor).join(", ")}</Text>
      <Button label="Remove" variant="outline" onPress={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} />
    </View>)}
    <Button label="Sign prescription" disabled={prescription.isPending || items.length === 0} onPress={() => prescription.mutate()} />

    <Text style={styles.heading}>Follow-up</Text>
    <Input label="Suggested date (YYYY-MM-DD)" value={followupDate} onChangeText={setFollowupDate} />
    <Input label="Reason" value={followupReason} onChangeText={setFollowupReason} multiline />
    <Button label="Recommend follow-up" variant="outline" disabled={followup.isPending || !followupDate || followupReason.trim().length < 2} onPress={() => followup.mutate()} />
    {message ? <Text accessibilityRole="alert">{message}</Text> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({ group: { gap: 10, marginTop: 8 }, heading: { fontSize: 18, fontWeight: "600", marginTop: 12 }, wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, draft: { borderWidth: 1, borderColor: "#D8E4E8", borderRadius: 8, padding: 8, gap: 6 }, error: { color: "#B42318" } });
