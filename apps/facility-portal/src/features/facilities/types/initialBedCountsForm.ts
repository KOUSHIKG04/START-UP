import type { BedInventoryProjection } from "@startup/contracts";
export type InitialBedCountsFormProps = {
  row: BedInventoryProjection;
  onSaved: (row: BedInventoryProjection) => void;
};
