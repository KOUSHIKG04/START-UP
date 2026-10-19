"use server";
import { revalidatePath } from "next/cache";
import {
  clinicCheckinTokenSchema,
  clinicTransitionSchema,
  portalWalkInBookingSchema,
  setClinicAutoConfirmLimitSchema,
  uuidSchema,
} from "@startup/contracts";
import {
  bookPortalWalkInAppointment,
  listMyPractices,
  listPracticeClinicSlots,
  redeemClinicCheckinToken,
  setClinicAutoConfirmLimit,
  transitionClinicAppointment,
} from "@startup/data-access";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedFacility } from "@/server/auth/facilityAccess";

export async function loadPortalWalkInPractices() {
  await requireApprovedFacility();
  const client = await createClient();
  return (await listMyPractices(client))
    .filter((practice) => practice.verified)
    .map((practice) => ({
      practiceId: practice.practice_id,
      doctorName: practice.doctor_name,
      facilityName: practice.facility_name,
    }));
}

export async function loadPortalWalkInSlots(practiceId: string) {
  const parsed = uuidSchema.safeParse(practiceId);
  if (!parsed.success) return [];
  await requireApprovedFacility();
  const client = await createClient();
  const practices = await listMyPractices(client);
  if (
    !practices.some(
      (practice) => practice.practice_id === parsed.data && practice.verified
    )
  )
    return [];
  return (
    await listPracticeClinicSlots(client, parsed.data, undefined, 100, "clinic")
  ).map((slot) => ({
    windowId: slot.window_id,
    practiceServiceId: slot.practice_service_id,
    startsAt: slot.starts_at,
    endsAt: slot.ends_at,
    timezone: slot.timezone,
    feeMinor: slot.fee_minor,
    currency: slot.currency,
  }));
}

export async function createPortalWalkInAppointment(
  input: unknown
): Promise<{ error: string | null }> {
  const parsed = portalWalkInBookingSchema.safeParse(input);
  if (!parsed.success)
    return {
      error: "Enter a patient name and choose an available clinic slot.",
    };
  await requireApprovedFacility();
  const client = await createClient();
  const { data: claims, error: authError } = await client.auth.getClaims();
  if (authError || !claims)
    return { error: "Your session expired. Sign in again." };
  try {
    await bookPortalWalkInAppointment(client, parsed.data);
    revalidatePath("/appointments");
    revalidatePath("/");
    revalidatePath("/dashboard");
    return { error: null };
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : null;
    if (code === "23514")
      return { error: "That slot is full. Choose another time." };
    if (code === "22023")
      return {
        error:
          "That slot is no longer available. Refresh the times and try again.",
      };
    if (code === "42501")
      return { error: "You do not have access to book this doctor." };
    return {
      error:
        "Could not create the appointment. Check your connection and try again.",
    };
  }
}

export async function changePortalAppointment(
  input: unknown
): Promise<{ error: string | null }> {
  const parsed = clinicTransitionSchema.safeParse(input);
  if (
    !parsed.success ||
    ![
      "approve",
      "reject",
      "check_in",
      "call",
      "hold",
      "resume",
      "no_show",
      "cancel",
    ].includes(parsed.data.action)
  ) {
    return { error: "Invalid appointment action." };
  }

  const client = await createClient();

  const { data: claims, error: authError } = await client.auth.getClaims();

  if (authError || !claims)
    return { error: "Your session expired. Sign in again." };

  try {
    await transitionClinicAppointment(client, parsed.data);
    revalidatePath("/appointments");
    revalidatePath("/");
    revalidatePath("/dashboard");
    return { error: null };
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : null;
    if (code === "PT409" || code === "40001")
      return { error: "This appointment changed. Refresh and try again." };
    if (code === "42501")
      return { error: "You do not have access to this appointment or action." };
    if (code === "22023" && parsed.data.action === "approve")
      return {
        error:
          "This request has expired or its appointment slot has started. Refresh to see current requests.",
      };
    return {
      error: "Could not update this appointment. Refresh and try again.",
    };
  }
}

export async function redeemPortalCheckinToken(
  token: string
): Promise<{ error: string | null }> {
  if (!clinicCheckinTokenSchema.safeParse(token).success)
    return { error: "Scan a valid clinic check-in QR code." };
  const client = await createClient();
  const { data: claims, error: authError } = await client.auth.getClaims();
  if (authError || !claims)
    return { error: "Your session expired. Sign in again." };
  try {
    await redeemClinicCheckinToken(client, token);
    revalidatePath("/appointments");
    return { error: null };
  } catch {
    return {
      error:
        "This QR code expired, was already used, or is for another practice. Ask the patient to refresh it.",
    };
  }
}

export async function changePortalAutoConfirmLimit(
  input: unknown
): Promise<{ error: string | null }> {
  const parsed = setClinicAutoConfirmLimitSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter a valid auto-confirm limit." };
  const client = await createClient();
  const { data: claims, error: authError } = await client.auth.getClaims();
  if (authError || !claims)
    return { error: "Your session expired. Sign in again." };
  try {
    await setClinicAutoConfirmLimit(client, parsed.data);
    revalidatePath("/appointments");
    return { error: null };
  } catch {
    return {
      error:
        "Could not update this session. Refresh and check your practice access.",
    };
  }
}
