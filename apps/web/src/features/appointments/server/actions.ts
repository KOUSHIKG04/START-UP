"use server";

import { revalidatePath } from "next/cache";
import { clinicCheckinTokenSchema, clinicTransitionSchema, setClinicAutoConfirmLimitSchema } from "@startup/contracts";
import { redeemClinicCheckinToken, setClinicAutoConfirmLimit, transitionClinicAppointment } from "@startup/data-access";
import { createClient } from "@/lib/supabase/server";

export async function changePortalAppointment(input: unknown): Promise<{ error: string | null }> {
  const parsed = clinicTransitionSchema.safeParse(input);
  if (!parsed.success || !["approve", "reject", "check_in", "call", "hold", "resume", "no_show", "cancel"].includes(parsed.data.action)) {
    return { error: "Invalid appointment action." };
  }
  const client = await createClient();
  const { data: claims, error: authError } = await client.auth.getClaims();
  if (authError || !claims) return { error: "Your session expired. Sign in again." };
  try {
    await transitionClinicAppointment(client, parsed.data);
    revalidatePath("/appointments");
    return { error: null };
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : null;
    if (code === "40001") return { error: "This appointment changed. Refresh and try again." };
    if (code === "42501") return { error: "You do not have access to this appointment or action." };
    return { error: "Could not update this appointment. Refresh and try again." };
  }
}

export async function redeemPortalCheckinToken(token: string): Promise<{ error: string | null }> {
  if (!clinicCheckinTokenSchema.safeParse(token).success) return { error: "Scan a valid clinic check-in QR code." };
  const client = await createClient();
  const { data: claims, error: authError } = await client.auth.getClaims();
  if (authError || !claims) return { error: "Your session expired. Sign in again." };
  try {
    await redeemClinicCheckinToken(client, token);
    revalidatePath("/appointments");
    return { error: null };
  } catch {
    return { error: "This QR code expired, was already used, or is for another practice. Ask the patient to refresh it." };
  }
}

export async function changePortalAutoConfirmLimit(input: unknown): Promise<{ error: string | null }> {
  const parsed = setClinicAutoConfirmLimitSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter a valid auto-confirm limit." };
  const client = await createClient();
  const { data: claims, error: authError } = await client.auth.getClaims();
  if (authError || !claims) return { error: "Your session expired. Sign in again." };
  try {
    await setClinicAutoConfirmLimit(client, parsed.data);
    revalidatePath("/appointments");
    return { error: null };
  } catch {
    return { error: "Could not update this session. Refresh and check your practice access." };
  }
}
