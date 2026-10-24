import type { Medicine } from "../../../types/doctor";

export const emptyMedicine = (): Medicine => ({
  id: `medicine-${Date.now()}`,
  name: "",
  timing: "After food",
  meals: [0, 0, 0],
  days: "5",
});
