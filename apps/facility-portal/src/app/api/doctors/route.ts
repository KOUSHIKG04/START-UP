import { NextResponse } from "next/server";
import { listMyFacilityDoctors } from "@startup/data-access";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const client = await createClient();
    const { data, error } = await client.auth.getClaims();
    
    if (error || !data)
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    
    const doctors = await listMyFacilityDoctors(client);
    
    return NextResponse.json(doctors, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Doctor directory is unavailable." },
      { status: 500 }
    );
  }
}
