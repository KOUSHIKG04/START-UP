import type { Medicine } from "../../../types/doctor";

export type MedicineCardProps = {
  medicine: Medicine;
  readOnly?: boolean;
  onEdit: (medicine: Medicine) => void;
  onRemove: (medicineId: string) => void;
  onUpdateTiming: (medicineId: string, timing: Medicine["timing"]) => void;
  onUpdateDose: (medicineId: string, mealIndex: number) => void;
};
