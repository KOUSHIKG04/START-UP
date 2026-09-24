import { z } from "zod";
import { uuidSchema } from "./validation";

export interface InventoryFacility {
  facilityId: string;
  facilityName: string;
  facilityKind: "hospital" | "clinic";
}

/** Counts reported by a facility; no admission or reservation guarantee. */
export interface BedInventoryProjection {
  inventoryId: string | null;
  facilityId: string;
  bedTypeId: string;
  bedTypeCode: string;
  bedTypeName: string;
  total: number;
  occupied: number;
  maintenance: number;
  /** Computed by the query, never independently written. */
  readonly available: number;
  observedAt: string | null;
  rowVersion: string | null;
  configured: boolean;
}

export const inventoryFacilitySchema = z.object({
  facility_id: uuidSchema,
  facility_name: z.string(),
  facility_kind: z.enum(["hospital", "clinic"]),
});

export const bedInventoryRpcSchema = z.object({
  inventory_id: uuidSchema.nullable(),
  facility_id: uuidSchema,
  bed_type_id: uuidSchema,
  bed_type_code: z.string(),
  bed_type_name: z.string(),
  total: z.number().int().nonnegative(),
  occupied: z.number().int().nonnegative(),
  maintenance: z.number().int().nonnegative(),
  available: z.number().int().nonnegative(),
  observed_at: z.iso.datetime({ offset: true }).nullable(),
  row_version: z.string().regex(/^[1-9]\d*$/).nullable(),
  configured: z.boolean(),
});

const bedCountSchema = z.number().int().min(0).max(2147483647);
export const updateBedInventorySchema = z
  .object({
    facilityId: uuidSchema,
    bedTypeId: uuidSchema,
    total: bedCountSchema,
    occupied: bedCountSchema,
    maintenance: bedCountSchema,
    /** "0" creates an unconfigured row; later writes require the current version. */
    expectedRowVersion: z.string().regex(/^(0|[1-9]\d*)$/),
  })
  .strict()
  .refine((value) => value.occupied + value.maintenance <= value.total, {
    message: "Occupied and maintenance beds cannot exceed total beds",
    path: ["total"],
  });

export interface UpdateBedInventoryInput {
  facilityId: string;
  bedTypeId: string;
  total: number;
  occupied: number;
  maintenance: number;
  expectedRowVersion: string;
}
