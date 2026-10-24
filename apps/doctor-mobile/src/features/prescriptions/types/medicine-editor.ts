import type { Medicine } from "../../../types/doctor";

export type MedicineEditorProps = {
  isEditingExisting: boolean;
  medicine: Medicine;
  onChange: (medicine: Medicine) => void;
  onCancel: () => void;
  onSave: () => void;
};
