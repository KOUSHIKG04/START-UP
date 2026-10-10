import type { AppSupabaseClient } from "../client/createSupabaseClient";
import { inAppNotificationSchema, uuidSchema } from "@startup/contracts";

export async function listMyNotifications(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("list_my_notifications");
  if (error) throw error;
  return inAppNotificationSchema.array().parse(data);
}

export async function markMyNotificationsRead(client: AppSupabaseClient, ids?: string[]) {
  const { data, error } = await client.rpc("mark_my_notifications_read", {
    p_ids: ids?.map((id) => uuidSchema.parse(id)) ?? null,
  });
  if (error) throw error;
  return data;
}

export async function registerMyExpoPushToken(client: AppSupabaseClient, installationId: string, token: string) {
  const { data, error } = await client.rpc("register_my_expo_push_token", {
    p_installation_id: installationId,
    p_token: token,
  });
  if (error) throw error;
  return data;
}

export async function revokeMyExpoPushToken(client: AppSupabaseClient, installationId: string) {
  const { error } = await client.rpc("revoke_my_expo_push_token", { p_installation_id: installationId });
  if (error) throw error;
}

export async function dismissMyNotification(client: AppSupabaseClient, id: string) {
  const { data, error } = await client.rpc("dismiss_my_notification", { p_id: uuidSchema.parse(id) });
  if (error) throw error;
  return data;
}
