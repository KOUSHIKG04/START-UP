import type { BedInventoryProjection } from "@startup/contracts";

export type DeptBedData = BedInventoryProjection & {
  id: string;
  name: string;
  dotColor: string;
  barColor: string;
};
