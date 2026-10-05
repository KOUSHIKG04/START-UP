import { z } from "zod";
import { uuidSchema } from "./validation";

export interface InventoryFacility {
  facilityId: string;
  facilityName: string;
  facilityKind: "hospital" | "clinic";
}

export const registeredCareFacilitySchema = z.object({
  id: uuidSchema, name: z.string(), kind: z.enum(["hospital", "clinic"]), address: z.string(),
});
export type RegisteredCareFacility = z.infer<typeof registeredCareFacilitySchema>;

export const doctorFacilityRequestSchema = z.object({
  id: uuidSchema, facility_id: uuidSchema, facility_name: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
  initiated_by: z.enum(["doctor", "facility"]),
  rejection_reason: z.string().nullable(), created_at: z.iso.datetime({ offset: true }),
});
export type DoctorFacilityRequest = z.infer<typeof doctorFacilityRequestSchema>;

export const facilityDoctorRequestSchema = doctorFacilityRequestSchema.extend({
  doctor_id: uuidSchema, doctor_name: z.string(), doctor_code: z.string(),
  credential_status: z.enum(["pending", "verified", "suspended"]),
});
export type FacilityDoctorRequest = z.infer<typeof facilityDoctorRequestSchema>;

export const registerCareFacilitySchema = z.object({
  name: z.string().trim().min(2).max(160), kind: z.enum(["hospital", "clinic"]),
  address: z.string().trim().min(5).max(500),
  locality: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  pincode: z.string().regex(/^[0-9]{6}$/),
  latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180),
  offersBeds: z.boolean(),
  bedTypeCodes: z.array(z.string().min(1)).max(20),
}).superRefine((value, context) => {
  if (value.offersBeds !== (value.bedTypeCodes.length > 0) ||
      new Set(value.bedTypeCodes).size !== value.bedTypeCodes.length) {
    context.addIssue({ code: "custom", path: ["bedTypeCodes"], message: "Select distinct bed categories only when beds are offered." });
  }
});
export type RegisterCareFacilityInput = z.infer<typeof registerCareFacilitySchema>;

export const bedTypeCatalogSchema = z.object({ code: z.string(), name: z.string() });
export type BedTypeCatalogItem = z.infer<typeof bedTypeCatalogSchema>;
export const companyFacilityBedDeclarationSchema = z.object({
  offers_beds: z.boolean().nullable(), bed_types: z.array(z.string()),
});
export type CompanyFacilityBedDeclaration = z.infer<typeof companyFacilityBedDeclarationSchema>;

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
