import { listFacilityBedInventory } from "@startup/data-access";
import { uuidSchema } from "@startup/contracts";
import { createClient } from "@/lib/supabase/server";
import { saveBedInventory } from "@/features/facilities/server/actions";

export async function PATCH(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: "Invalid request origin" }, { status: 403 });

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object" || Array.isArray(body))
    return Response.json({ error: "Invalid bed counts" }, { status: 400 });

  const form = new FormData();

  for (const [key, value] of Object.entries(body))
    if (typeof value === "string" || typeof value === "number")
      form.set(key, String(value));
  try {
    const result = await saveBedInventory(form);
    return Response.json(result, {
      status: result.error
        ? result.code === "PT409"
          ? 409
          : result.code === "42501"
            ? 403
            : 400
        : 200,
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Could not save bed counts. Try again." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const facility = uuidSchema.safeParse(
    new URL(request.url).searchParams.get("facilityId")
  );

  if (!facility.success)
    return Response.json({ error: "Invalid facility" }, { status: 400 });
  try {
    const client = await createClient();

    const { data, error } = await client.auth.getClaims();

    if (error || !data)
      return Response.json({ error: "Sign in again" }, { status: 401 });

    return Response.json(
      { rows: await listFacilityBedInventory(client, facility.data) },
      { headers: { "cache-control": "no-store" } }
    );
  } catch {
    return Response.json(
      { error: "Could not reload bed counts" },
      { status: 403 }
    );
  }
}
