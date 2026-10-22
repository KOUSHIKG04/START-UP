import {
  clinicSlotSchema,
  uuidSchema,
  doctorDailySlotUsageSchema,
  portalClinicDaySchema,
} from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function getPortalClinicDay(
  client: AppSupabaseClient,
  practiceId: string,
  localDay?: string
) {
  if (localDay && !/^\d{4}-\d{2}-\d{2}$/.test(localDay))
    throw new Error("Choose a valid date.");
  const { data, error } = await client.rpc("get_portal_clinic_day", {
    p_practice_id: uuidSchema.parse(practiceId),
    p_local_day: localDay ?? null,
  });
  if (error) throw error;
  return portalClinicDaySchema.parse(data);
}

export async function getMyDoctorDailySlotUsage(
  client: AppSupabaseClient,
  practiceId: string,
  localDay: string
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDay))
    throw new Error("Choose a valid date.");
  const { data, error } = await client.rpc("get_my_doctor_daily_slot_usage", {
    p_practice_id: uuidSchema.parse(practiceId),
    p_local_day: localDay,
  });
  if (error) throw error;
  return doctorDailySlotUsageSchema.parse(data);
}

export async function listClinicSlots(
  client: AppSupabaseClient,
  after = new Date(),
  limit = 50
) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Invalid slot limit");
  }

  const { data, error } = await client.rpc("list_clinic_slots", {
    p_after: after.toISOString(),
    p_limit: limit,
  });
  if (error) throw error;
  return clinicSlotSchema.array().parse(data);
}

export async function listPracticeClinicSlots(
  client: AppSupabaseClient,
  practiceId: string,
  serviceId?: string,
  limit = 100,
  serviceMode?: "clinic" | "online" | "home"
) {
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > (serviceMode ? 10000 : 100)
  )
    throw new Error("Invalid slot limit");
  const args = {
    p_practice_id: uuidSchema.parse(practiceId),
    p_service_id: serviceId ? uuidSchema.parse(serviceId) : null,
    p_limit: limit,
  };
  const { data, error } = serviceMode
    ? await client.rpc("list_practice_service_slots", {
        ...args,
        p_mode: serviceMode,
      })
    : await client.rpc("list_practice_clinic_slots", args);
  if (error) throw error;
  return clinicSlotSchema.array().parse(data);
}
