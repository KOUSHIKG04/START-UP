import { useState } from "react";
import { View } from "react-native";
import { Button, Input } from "@startup/mobile-ui";
import { Plus } from "lucide-react-native";
import {
  Choice,
  DoctorScreen,
  Heading,
  Label,
  MissingPatient,
  palette,
  Panel,
  ui,
} from "../../components/DoctorScreen";
import { useVisit } from "../../utils/consultation";
import { useDoctorStore } from "../../store/useDoctorStore";
import { createConsultation } from "../../data/demo";
import type { Medicine } from "../../types/doctor";

const emptyMedicine = (): Medicine => ({
  id: `medicine-${Date.now()}`,
  name: "",
  timing: "After food",
  meals: [0, 0, 0],
  days: "5",
});
export function PrescriptionScreen() {
  const { patient, appointment } = useVisit();
  const visits = useDoctorStore((s) => s.consultations);
  const update = useDoctorStore((s) => s.updateConsultation);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  if (!patient || !appointment) return <MissingPatient />;
  const visit = visits[appointment.id] ?? createConsultation(patient.id);
  const readOnly = visit.signed || visit.completed;
  const changeMedicines = (medicines: Medicine[]) => {
    if (!readOnly) update(appointment.id, patient.id, { medicines });
  };
  const saveMedicine = () => {
    if (!editing) return;
    if (
      !editing.name.trim() ||
      !/^[1-9]\d{0,2}$/.test(editing.days) ||
      editing.meals.every((value) => value === 0)
    ) {
      setError(
        "Enter a medicine name, at least one dose, and a duration from 1 to 999 days."
      );
      return;
    }
    const next = { ...editing, name: editing.name.trim() };
    changeMedicines(
      visit.medicines.some((m) => m.id === next.id)
        ? visit.medicines.map((m) => (m.id === next.id ? next : m))
        : [...visit.medicines, next]
    );
    setEditing(null);
    setError("");
  };
  const sign = () => {
    if (!visit.medicines.length) {
      setError("Add at least one medicine before signing.");
      return;
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(visit.followUp) ||
      !Number.isFinite(Date.parse(visit.followUp)) ||
      new Date(visit.followUp).toISOString().slice(0, 10) !== visit.followUp
    ) {
      setError("Enter a valid follow-up date as YYYY-MM-DD.");
      return;
    }
    setError("");
    setConfirm(true);
  };
  return (
    <DoctorScreen
      title="Write prescription"
      subtitle={`${patient.name} – ${visit.completed ? "Consultation completed" : "Consultation in progress"}`}
    >
      {visit.signed && (
        <Label style={ui.success}>
          Demo prescription signed and saved locally. No prescription was sent.
        </Label>
      )}
      {visit.medicines.map((medicine) => (
        <Panel key={medicine.id} style={{ gap: 14 }}>
          <View style={[ui.between, { flexWrap: "wrap" }]}>
            <Heading style={{ color: palette.text, fontSize: 14 }}>
              {medicine.name}
            </Heading>
            <View style={{ ...ui.row, gap: 4 }}>
              {(["Before food", "After food"] as const).map((timing) => (
                <Button
                  key={timing}
                  variant="ghost"
                  theme="doctor"
                  disabled={readOnly}
                  label={timing}
                  labelStyle={{
                    fontSize: 11,
                    color:
                      medicine.timing === timing ? palette.dark : palette.muted,
                    textDecorationLine:
                      medicine.timing === timing ? "underline" : "none",
                  }}
                  style={{ paddingHorizontal: 6 }}
                  onPress={() =>
                    changeMedicines(
                      visit.medicines.map((m) =>
                        m.id === medicine.id ? { ...m, timing } : m
                      )
                    )
                  }
                />
              ))}
            </View>
          </View>
          <View style={ui.divider} />
          <View
            style={{
              ...ui.row,
              paddingVertical: 16,
              backgroundColor: palette.subtle,
              borderRadius: 12,
            }}
          >
            {["Breakfast", "Lunch", "Dinner"].map((meal, index) => (
              <View
                key={meal}
                style={{ flex: 1, gap: 10, alignItems: "center" }}
              >
                <Label muted style={{ fontSize: 12 }}>
                  {meal}
                </Label>
                <Button
                  theme="doctor"
                  variant="outline"
                  label={String(medicine.meals[index])}
                  accessibilityLabel={`${medicine.name}, ${meal}, ${medicine.meals[index]} tablets. Tap to change dose.`}
                  disabled={readOnly}
                  style={{
                    minWidth: 44,
                    borderColor: medicine.meals[index]
                      ? palette.dark
                      : palette.border,
                    backgroundColor: "white",
                  }}
                  onPress={() =>
                    changeMedicines(
                      visit.medicines.map((m) => {
                        if (m.id !== medicine.id) return m;
                        const meals = [...m.meals] as Medicine["meals"];
                        meals[index] = (meals[index] + 1) % 3;
                        return { ...m, meals };
                      })
                    )
                  }
                />
              </View>
            ))}
          </View>
          <Label
            style={{ color: palette.dark, fontSize: 12, textAlign: "center" }}
          >
            {medicine.meals.join(" – ")} tablets ·{" "}
            {medicine.meals.filter(Boolean).length} times daily ·{" "}
            {medicine.days} days
          </Label>
          {!readOnly && (
            <>
              <View style={ui.divider} />
              <View style={ui.between}>
                <Button
                  variant="ghost"
                  theme="doctor"
                  label="Edit"
                  accessibilityLabel={`Edit ${medicine.name}`}
                  onPress={() => {
                    setEditing({ ...medicine, meals: [...medicine.meals] });
                    setError("");
                  }}
                />
                <Button
                  variant="ghost"
                  label="Remove"
                  accessibilityLabel={`Remove ${medicine.name}`}
                  labelStyle={{ color: palette.danger }}
                  onPress={() =>
                    changeMedicines(
                      visit.medicines.filter((m) => m.id !== medicine.id)
                    )
                  }
                />
              </View>
            </>
          )}
        </Panel>
      ))}
      {!visit.medicines.length && (
        <Panel>
          <Heading>No medicines added</Heading>
          <Label muted>
            Add a medicine to create this patient’s demo prescription.
          </Label>
        </Panel>
      )}
      {editing && !readOnly && (
        <Panel>
          <Heading>
            {visit.medicines.some((m) => m.id === editing.id)
              ? "Edit medicine"
              : "Add medicine"}
          </Heading>
          <Input
            label="Medicine name and strength"
            accessibilityLabel="Medicine name and strength"
            value={editing.name}
            onChangeText={(name) => setEditing({ ...editing, name })}
            containerStyle={ui.field}
          />
          <Input
            label="Duration (days)"
            accessibilityLabel="Duration in days"
            keyboardType="number-pad"
            value={editing.days}
            onChangeText={(days) => setEditing({ ...editing, days })}
            containerStyle={ui.field}
          />
          <View style={ui.wrap}>
            {(["Before food", "After food"] as const).map((timing) => (
              <Choice
                key={timing}
                label={timing}
                selected={editing.timing === timing}
                onPress={() => setEditing({ ...editing, timing })}
              />
            ))}
          </View>
          <View style={ui.row}>
            {["Breakfast", "Lunch", "Dinner"].map((meal, index) => (
              <Input
                key={meal}
                label={meal}
                accessibilityLabel={`${meal} dose`}
                keyboardType="number-pad"
                maxLength={1}
                value={String(editing.meals[index])}
                containerStyle={ui.flex}
                onChangeText={(value) => {
                  const meals = [...editing.meals] as Medicine["meals"];
                  meals[index] = Math.min(
                    9,
                    Number(value.replace(/\D/g, "")) || 0
                  );
                  setEditing({ ...editing, meals });
                }}
              />
            ))}
          </View>
          <View style={ui.row}>
            <Button
              label="Cancel"
              variant="secondary"
              theme="doctor"
              onPress={() => {
                setEditing(null);
                setError("");
              }}
              style={ui.flex}
            />
            <Button
              label="Save medicine"
              theme="doctor"
              onPress={saveMedicine}
              style={ui.flex}
            />
          </View>
        </Panel>
      )}
      {!readOnly && !editing && (
        <Button
          label="Add medicine"
          theme="doctor"
          variant="secondary"
          leftIcon={<Plus size={20} color={palette.primary} />}
          onPress={() => {
            setEditing(emptyMedicine());
            setError("");
          }}
        />
      )}
      <Panel style={{ backgroundColor: palette.subtle }}>
        <Input
          label="Follow-up date"
          accessibilityLabel="Follow-up date"
          placeholder="YYYY-MM-DD"
          value={visit.followUp}
          editable={!readOnly}
          containerStyle={ui.field}
          onChangeText={(followUp) =>
            update(appointment.id, patient.id, { followUp })
          }
        />
        <Label muted style={{ fontSize: 12 }}>
          Clinic visit · Date format: YYYY-MM-DD
        </Label>
      </Panel>
      {!!error && <Label style={ui.error}>{error}</Label>}
      {!readOnly && !editing && (
        <Button label="Sign & send to patient" theme="doctor" onPress={sign} />
      )}
      {confirm && !readOnly && (
        <Panel>
          <Heading>Sign demo prescription?</Heading>
          <Label>
            This saves the prescription in this app session. It does not send
            anything to a patient.
          </Label>
          <View style={ui.row}>
            <Button
              label="Cancel"
              theme="doctor"
              variant="secondary"
              style={ui.flex}
              onPress={() => setConfirm(false)}
            />
            <Button
              label="Sign demo"
              theme="doctor"
              style={ui.flex}
              onPress={() => {
                if (
                  visit.medicines.some((m) => m.meals.every((v) => v === 0))
                ) {
                  setError("Each medicine needs at least one dose.");
                  setConfirm(false);
                  return;
                }
                update(appointment.id, patient.id, { signed: true });
                setConfirm(false);
              }}
            />
          </View>
        </Panel>
      )}
    </DoctorScreen>
  );
}
