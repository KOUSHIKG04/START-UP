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
  AddClinicUnavailabilityInput,
} from "@startup/contracts";
import {
  getMySchedulePreferences,
  getMyDoctorDailySlotUsage,
  listMyFacilityDoctors,
  listMyClinicSessions,
  saveMySchedulePreferences,
  publishSelectedDoctorSlots,
  publishMyDoctorSchedule,
  listClinicUnavailability,
  addClinicUnavailability,
  revokeClinicUnavailability,
  setAppointmentRecoveryPolicy,
} from "@startup/data-access";
import { recoveryPolicySchema } from "@startup/contracts";
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

export async function loadFacilityRecoveryPolicy(practiceId: string) {
  return (await authorizedPractice(practiceId)).settings;
}

export async function saveFacilityRecoveryPolicy(input: unknown) {
  const parsed = recoveryPolicySchema.parse(input);
  const { client } = await authorizedPractice(parsed.practiceId);
  const settings = await setAppointmentRecoveryPolicy(client, parsed);
  revalidatePath("/doctor-schedules");
  return settings;
}

export async function loadFacilityDoctorSchedule(
  practiceId: string,
  localDay?: string
) {
  try {
    const { client, doctor, settings } = await authorizedPractice(practiceId);
    if (localDay) z.iso.date().parse(localDay);
    const [sessions, usage, unavailable] = await Promise.all([
      listMyClinicSessions(client, practiceId),
      localDay
        ? getMyDoctorDailySlotUsage(client, practiceId, localDay)
        : Promise.resolve(null),
      listClinicUnavailability(client, practiceId),
    ]);
    return {
      ok: true as const,
      doctor,
      settings,
      sessions,
      usage,
      unavailable,
    };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false as const,
      error:
        error instanceof Error ? error.message : "Could not load schedule.",
    };
  }
}

export async function publishFacilityDoctorSchedule(
  practiceId: string,
  mode: "clinic" | "online" | "home",
  settings: DoctorScheduleSettings,
  expectedVersion: number,
  effectiveFrom?: string
) {
  try {
    const value = doctorScheduleSettingsSchema.parse(settings);
    z.enum(["clinic", "online", "home"]).parse(mode);
    z.number().int().safe().nonnegative().parse(expectedVersion);
    if (effectiveFrom) z.iso.date().parse(effectiveFrom);
    const { client } = await authorizedPractice(practiceId);
    const publication = await publishMyDoctorSchedule(
      client,
      practiceId,
      mode,
      value,
      expectedVersion,
      effectiveFrom
    );
    revalidatePath("/doctor-schedules");
    revalidatePath("/appointments");
    return { ok: true as const, ...publication };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false as const,
      error:
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "PT409"
          ? "Schedule changed in another app. Refresh and review before publishing again."
          : error instanceof Error
            ? error.message
            : "Could not publish schedule.",
    };
  }
}

export async function addFacilityDoctorUnavailability(
  input: AddClinicUnavailabilityInput
) {
  try {
    const { client } = await authorizedPractice(input.practiceId);
    await addClinicUnavailability(client, input);
    revalidatePath("/doctor-schedules");
    revalidatePath("/appointments");
    return { ok: true as const };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Could not add unavailable time.",
    };
  }
}

export async function removeFacilityDoctorUnavailability(
  practiceId: string,
  exceptionId: string,
  expectedVersion: number
) {
  try {
    const { client } = await authorizedPractice(practiceId);
    // Revocation also checks that the exception belongs to an authorized practice.
    const items = await listClinicUnavailability(client, practiceId);
    if (!items.some((item) => item.id === exceptionId))
      throw new Error("Unavailable time does not belong to this practice.");
    await revokeClinicUnavailability(client, { exceptionId, expectedVersion });
    revalidatePath("/doctor-schedules");
    revalidatePath("/appointments");
    return { ok: true as const };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Could not remove unavailable time.",
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
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "PT409"
          ? "Schedule changed in another app. Refresh before saving again."
          : error instanceof Error
            ? error.message
            : "Could not save schedule.",
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
