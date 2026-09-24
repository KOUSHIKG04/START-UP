import {
  bedInventoryRpcSchema,
  inventoryFacilitySchema,
  updateBedInventorySchema,
  uuidSchema,
} from "@startup/contracts";
import type {
  BedInventoryProjection,
  InventoryFacility,
  UpdateBedInventoryInput,
} from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

function toInventoryProjection(
  value: ReturnType<typeof bedInventoryRpcSchema.parse>
): BedInventoryProjection {
  return {
    inventoryId: value.inventory_id,
    facilityId: value.facility_id,
    bedTypeId: value.bed_type_id,
    bedTypeCode: value.bed_type_code,
    bedTypeName: value.bed_type_name,
    total: value.total,
    occupied: value.occupied,
    maintenance: value.maintenance,
    available: value.available,
    observedAt: value.observed_at,
    rowVersion: value.row_version,
    configured: value.configured,
  };
}

export async function listMyInventoryFacilities(
  client: AppSupabaseClient
): Promise<InventoryFacility[]> {
  const { data, error } = await client.rpc("list_my_inventory_facilities");
  if (error) throw error;
  return inventoryFacilitySchema.array().parse(data).map((facility) => ({
    facilityId: facility.facility_id,
    facilityName: facility.facility_name,
    facilityKind: facility.facility_kind,
  }));
}

export async function listFacilityBedInventory(
  client: AppSupabaseClient,
  facilityId: string
): Promise<BedInventoryProjection[]> {
  const { data, error } = await client.rpc("list_facility_bed_inventory", {
    p_facility_id: uuidSchema.parse(facilityId),
  });
  if (error) throw error;
  return bedInventoryRpcSchema.array().parse(data).map(toInventoryProjection);
}

export async function updateFacilityBedInventory(
  client: AppSupabaseClient,
  input: UpdateBedInventoryInput
): Promise<BedInventoryProjection> {
  const request = updateBedInventorySchema.parse(input);
  const { data, error } = await client.rpc("update_facility_bed_inventory", {
    p_facility_id: request.facilityId,
    p_bed_type_id: request.bedTypeId,
    p_total: request.total,
    p_occupied: request.occupied,
    p_maintenance: request.maintenance,
    p_expected_version: request.expectedRowVersion,
  });
  if (error) throw error;
  return toInventoryProjection(bedInventoryRpcSchema.parse(data));
}
