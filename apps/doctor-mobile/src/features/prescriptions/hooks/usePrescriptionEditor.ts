import { parseDisplayDate } from "@startup/contracts";
import { createConsultation } from "../../../data/demo";
import type { Medicine } from "../../../types/doctor";
import { useToastFeedback } from "@startup/mobile-ui";
import { useState } from "react";
import { useVisit } from "../../consultations/hooks/useVisit";
import { useDoctorStore } from "../../../stores/useDoctorStore";

export function usePrescriptionEditor() {
  const { patient, appointment } = useVisit();
  const visits = useDoctorStore((s) => s.consultations);
  const update = useDoctorStore((s) => s.updateConsultation);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [error, setError] = useState("");
  useToastFeedback({ error });
  const [confirm, setConfirm] = useState(false);

  if (!patient || !appointment) return null;
  const visit = visits[appointment.id] ?? createConsultation(patient.id);
  const readOnly = visit.signed || visit.completed;

  const changeMedicines = (medicines: Medicine[]) => {
    if (!readOnly) update(appointment.id, patient.id, { medicines });
  };

  const handleUpdateTiming = (
    medicineId: string,
    timing: Medicine["timing"]
  ) => {
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

  return {
    patient,
    appointment,
    update,
    editing,
    setEditing,
    setError,
    confirm,
    setConfirm,
    visit,
    readOnly,
    handleStartEdit,
    handleRemove,
    handleUpdateTiming,
    handleUpdateDose,
    saveMedicine,
    sign,
  };
}
