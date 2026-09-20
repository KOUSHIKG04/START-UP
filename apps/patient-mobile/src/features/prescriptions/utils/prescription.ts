export type PrescriptionMedicine = {
  id: number;
  name: string;
  dose: string;
  schedule: { breakfast: number; lunch: number; dinner: number };
};

export const prescriptionMedicines: PrescriptionMedicine[] = [
  {
    id: 1,
    name: "Paracetamol 500 mg",
    dose: "1 tablet · 2 times daily · 5 days · After food",
    schedule: { breakfast: 0, lunch: 1, dinner: 1 },
  },
  {
    id: 2,
    name: "Amoxycillin 500 mg",
    dose: "1 capsule · 2 times daily · 5 days · After food",
    schedule: { breakfast: 0, lunch: 1, dinner: 1 },
  },
  {
    id: 3,
    name: "Cough Relief Syrup",
    dose: "10 ml · 2 times daily · 5 days · After food",
    schedule: { breakfast: 0, lunch: 1, dinner: 1 },
  },
];
