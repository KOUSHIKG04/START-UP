import {
  onlineJoinContextSchema,
  onlineMessageSchema,
  onlineTokenSchema,
  publishClinicSessionSchema,
  uuidSchema,
  type PublishClinicSessionInput,
} from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function publishOnlineSession(client: AppSupabaseClient, input: PublishClinicSessionInput) {
  const value = publishClinicSessionSchema.parse(input);
  const { data, error } = await client.rpc("publish_online_session", {
    p_practice_id: value.practiceId,
    p_starts_at: value.startsAt,
    p_ends_at: value.endsAt,
    p_slot_minutes: value.slotMinutes,
    p_fee_minor: value.feeMinor,
    p_currency: value.currency,
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}

export async function getOnlineJoinContext(client: AppSupabaseClient, appointmentId: string) {
  const { data, error } = await client.rpc("get_online_join_context", { p_appointment_id: uuidSchema.parse(appointmentId) });
  if (error) throw error;
  return data == null ? null : onlineJoinContextSchema.parse(data);
}

export async function startOnlineAppointment(client: AppSupabaseClient, appointmentId: string) {
  const { data, error } = await client.rpc("start_online_appointment", { p_appointment_id: uuidSchema.parse(appointmentId) });
  if (error) throw error;
  return uuidSchema.parse(data);
}

export async function completeOnlineAppointment(client: AppSupabaseClient, appointmentId: string, assessment: string) {
  const { data, error } = await client.rpc("complete_online_appointment", {
    p_appointment_id: uuidSchema.parse(appointmentId), p_assessment: assessment.trim(),
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}

export async function listOnlineMessages(client: AppSupabaseClient, appointmentId: string) {
  const { data, error } = await client.rpc("list_online_messages", { p_appointment_id: uuidSchema.parse(appointmentId) });
  if (error) throw error;
  return onlineMessageSchema.array().parse(data);
}

export async function sendOnlineMessage(client: AppSupabaseClient, appointmentId: string, body: string, clientNonce: string) {
  const text = body.trim();
  if (!text || text.length > 2000) throw new Error("Message must be 1–2000 characters.");
  const { data, error } = await client.rpc("send_online_message", {
    p_appointment_id: uuidSchema.parse(appointmentId),
    p_client_nonce: uuidSchema.parse(clientNonce),
    p_body: text,
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}

export async function getOnlineVideoToken(client: AppSupabaseClient, appointmentId: string) {
  const { data, error } = await client.functions.invoke("online-video-token", {
    body: { appointmentId: uuidSchema.parse(appointmentId) },
  });
  if (error) throw error;
  return onlineTokenSchema.parse(data);
}

export function subscribeOnlineMessages(client: AppSupabaseClient, appointmentId: string, onMessage: () => void) {
  const id = uuidSchema.parse(appointmentId);
  const channel = client.channel(`online-message-${id}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "online_message", filter: `appointment_id=eq.${id}` }, onMessage)
    .subscribe();
  return () => { void client.removeChannel(channel); };
}
