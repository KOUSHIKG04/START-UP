"use server";
import "server-only";
import { unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  doctorScheduleSettingsSchema,
  publishSelectedDoctorSlotsSchema,
  uuidSchema,
} from "@startup/contracts";
import type {
  DoctorScheduleSettings,
  PublishSelectedDoctorSlotsInput,
} from "@startup/contracts";
import {
  getMySchedulePreferences,
  getMyDoctorDailySlotUsage,
  listMyFacilityDoctors,
  listMyClinicSessions,
  saveMySchedulePreferences,
  publishSelectedDoctorSlots,
} from "@startup/data-access";
import { requireApprovedFacility } from "@/server/auth/facilityAccess";
import { createClient } from "@/lib/supabase/server";
async function authorizedPractice(practiceId: string) {
  uuidSchema.parse(practiceId);
  await requireApprovedFacility();
  const client = await createClient();
  const doctor = (await listMyFacilityDoctors(client)).find(
    (item) => item.practice_id === practiceId && item.verified
  );
  if (!doctor)
    throw new Error(
      "An approved doctor association with your facility is required."
    );
  if (!doctor.booking_timezone)
    throw new Error(
      "Practice timezone unavailable. Refresh after database setup."
    );
  // This RPC checks owner/admin membership at the database boundary.
  const settings = await getMySchedulePreferences(client, practiceId);
  return { client, doctor, settings };
}
export async function loadFacilityDoctorSchedule(
  practiceId: string,
  localDay?: string
) {
  try {
    const { client, doctor, settings } = await authorizedPractice(practiceId);
    if (localDay) z.iso.date().parse(localDay);
    const [sessions, usage] = await Promise.all([
      listMyClinicSessions(client, practiceId),
      localDay
        ? getMyDoctorDailySlotUsage(client, practiceId, localDay)
        : Promise.resolve(null),
    ]);
    return { ok: true as const, doctor, settings, sessions, usage };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false as const,
      error:
        error instanceof Error ? error.message : "Could not load schedule.",
    };
  }
}
export async function saveFacilityDoctorSchedule(
  practiceId: string,
  settings: DoctorScheduleSettings,
  expectedVersion: number
) {
  try {
    const value = doctorScheduleSettingsSchema.parse(settings);
    z.number().int().safe().nonnegative().parse(expectedVersion);
    const { client } = await authorizedPractice(practiceId);
    const saved = await saveMySchedulePreferences(
      client,
      practiceId,
      value,
      expectedVersion
    );
    revalidatePath("/doctor-schedules");
    return { ok: true as const, settings: saved };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false as const,
      error:
        error instanceof Error ? error.message : "Could not save schedule.",
    };
  }
}
export async function publishFacilityDoctorSlots(
  input: PublishSelectedDoctorSlotsInput
) {
  try {
    const value = publishSelectedDoctorSlotsSchema.parse(input);
    const { client } = await authorizedPractice(value.practiceId);
    await publishSelectedDoctorSlots(client, value);
    revalidatePath("/doctor-schedules");
    revalidatePath("/appointments");
    revalidatePath("/dashboard");
    return { ok: true as const, count: value.slotStarts.length };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false as const,
      error:
        error instanceof Error ? error.message : "Could not publish slots.",
    };
  }
}
