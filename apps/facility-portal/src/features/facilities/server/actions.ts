"use server";
import type { BedInventoryProjection } from "@startup/contracts";
import { updateBedInventorySchema } from "@startup/contracts";
import { updateFacilityBedInventory } from "@startup/data-access";
import { createClient } from "@/lib/supabase/server";

export async function saveBedInventory(formData: FormData): Promise<{
  error: string | null;
  row?: BedInventoryProjection;
  code?: string;
}> {
  const counts = ["total", "occupied", "maintenance"].map((name) =>
    formData.get(name)
  );
  if (
    counts.some((count) => typeof count !== "string" || count.trim() === "")
  ) {
    return { error: "Enter all three bed counts." };
  }
  const parsed = updateBedInventorySchema.safeParse({
    facilityId: formData.get("facilityId"),
    bedTypeId: formData.get("bedTypeId"),
    total: Number(formData.get("total")),
    occupied: Number(formData.get("occupied")),
    maintenance: Number(formData.get("maintenance")),
    expectedRowVersion: formData.get("expectedRowVersion"),
  });
  if (!parsed.success) {
    return {
      error:
        "Use valid bed counts. Occupied and maintenance cannot exceed total.",
    };
  }
  const client = await createClient();
  const { data: claims, error: authError } = await client.auth.getClaims();
  if (authError || !claims)
    return { error: "Your session expired. Sign in again." };
  try {
    const row = await updateFacilityBedInventory(client, parsed.data);
    return { error: null, row };
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : null;
    if (code === "PT409")
      return {
        error: "These counts changed. Review the latest counts and try again.",
        code,
      };
    if (code === "42501")
      return {
        error: "You do not have permission to change this facility.",
        code,
      };
    return { error: "Could not save the counts. Refresh and try again." };
  }
}
