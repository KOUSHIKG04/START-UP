import type { BedInventoryProjection } from "@startup/contracts";

export class BedSaveError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
  }
}

export async function saveBedCounts(
  form: FormData
): Promise<BedInventoryProjection> {
  const response = await fetch("/api/bed-inventory", {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(Object.fromEntries(form.entries())),
  });
  const result = (await response.json()) as {
    error?: string;
    code?: string;
    row?: BedInventoryProjection;
  };
  if (!response.ok || result.error || !result.row)
    throw new BedSaveError(
      result.error || "Could not save bed counts.",
      result.code
    );
  return result.row;
}

export async function reloadBedCounts(
  facilityId: string
): Promise<BedInventoryProjection[]> {
  const response = await fetch(
    `/api/bed-inventory?facilityId=${encodeURIComponent(facilityId)}`,
    { cache: "no-store", credentials: "same-origin" }
  );
  const result = await response.json();
  if (!response.ok || !Array.isArray(result.rows))
    throw new Error("Could not reload bed counts.");
  return result.rows;
}
