import { useToastFeedback } from "@startup/mobile-ui";
import { useState } from "react";
import { View } from "react-native";
import { Button, Input } from "@startup/mobile-ui";
import { parseDisplayDate } from "@startup/contracts";
import { Plus } from "lucide-react-native";
import {
  DoctorScreen,
  Heading,
  Label,
  MissingPatient,
  Panel,
} from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";
import { useVisit } from "../../consultations/utils/consultation";
import { useDoctorStore } from "../../../stores/useDoctorStore";
import { createConsultation } from "../../../data/demo";
import type { Medicine } from "../../../types/doctor";
import { MedicineCard } from "../components/MedicineCard";
import { MedicineEditor } from "../components/MedicineEditor";

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
  useToastFeedback({ error });
  const [confirm, setConfirm] = useState(false);
  if (!patient || !appointment) return <MissingPatient />;
  const visit = visits[appointment.id] ?? createConsultation(patient.id);
  const readOnly = visit.signed || visit.completed;

  const changeMedicines = (medicines: Medicine[]) => {
    if (!readOnly) update(appointment.id, patient.id, { medicines });
  };

  const handleUpdateTiming = (medicineId: string, timing: Medicine["timing"]) => {
    changeMedicines(
      visit.medicines.map((m) => (m.id === medicineId ? { ...m, timing } : m))
    );
  };

  const handleUpdateDose = (medicineId: string, mealIndex: number) => {
    changeMedicines(
      visit.medicines.map((m) => {
        if (m.id !== medicineId) return m;
        const meals = [...m.meals] as Medicine["meals"];
        meals[mealIndex] = (meals[mealIndex] + 1) % 3;
        return { ...m, meals };
      })
    );
  };

  const handleRemove = (medicineId: string) => {
    changeMedicines(visit.medicines.filter((m) => m.id !== medicineId));
  };

  const handleStartEdit = (medicine: Medicine) => {
    setEditing({ ...medicine, meals: [...medicine.meals] });
    setError("");
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
    if (!parseDisplayDate(visit.followUp)) {
      setError("Enter a valid follow-up date as DD-MM-YYYY.");
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
        <MedicineCard
          key={medicine.id}
          medicine={medicine}
          readOnly={readOnly}
          onEdit={handleStartEdit}
          onRemove={handleRemove}
          onUpdateTiming={handleUpdateTiming}
          onUpdateDose={handleUpdateDose}
        />
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
        <MedicineEditor
          isEditingExisting={visit.medicines.some((m) => m.id === editing.id)}
          medicine={editing}
          onChange={setEditing}
          onCancel={() => {
            setEditing(null);
            setError("");
          }}
          onSave={saveMedicine}
        />
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
          placeholder="DD-MM-YYYY"
          value={visit.followUp}
          editable={!readOnly}
          containerStyle={ui.field}
          onChangeText={(followUp) =>
            update(appointment.id, patient.id, { followUp })
          }
        />
        <Label muted style={{ fontSize: 12 }}>
          Clinic visit · Date format: DD-MM-YYYY
        </Label>
      </Panel>
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
