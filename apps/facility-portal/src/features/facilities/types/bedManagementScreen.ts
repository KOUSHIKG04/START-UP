import type { BedInventoryProjection } from "@startup/contracts";
export type BedManagementScreenProps = {
  inventory: BedInventoryProjection[];
  loadError?: string;
};
