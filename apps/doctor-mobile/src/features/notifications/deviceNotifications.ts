import { useEffect } from "react";
import { Platform } from "react-native";
import { isRunningInExpoGo } from "expo";
import { router } from "expo-router";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import type { NotificationResponse } from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { registerMyExpoPushToken, revokeMyExpoPushToken } from "@startup/data-access";
import { supabase } from "../../services/supabase";

const installationKey = "clinzo-doctor-push-installation";
// Importing the module itself can activate its Android push listener in Expo Go.
const Notifications: typeof import("expo-notifications") | null = isRunningInExpoGo()
  ? null
  : require("expo-notifications");

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true,
    shouldPlaySound: false, shouldSetBadge: false,
  }),
});

async function installationId() {
  let id = await SecureStore.getItemAsync(installationKey);
  if (!id) {
    id = Crypto.randomUUID();
    await SecureStore.setItemAsync(installationKey, id);
  }
  return id;
}

async function register() {
  if (!supabase || !Notifications || Platform.OS === "web" || !Device.isDevice) return;
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof projectId !== "string" || !projectId) return;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("general", {
      name: "General", importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await registerMyExpoPushToken(supabase, await installationId(), token);
}

function openNotification(response: NotificationResponse) {
  const route = response.notification.request.content.data?.route;
  if (route === "/appointments") router.push("/appointments");
  else if (route === "/home-visit") router.push("/home-visit");
  else if (route === "/chat") router.push("/chat");
}

export function useDeviceNotifications(identityId: string | undefined) {
  useEffect(() => {
    if (!identityId || !Notifications || Platform.OS === "web") return;
    const tokenListener = Notifications.addPushTokenListener(() => { void register().catch(() => {}); });
    const responseListener = Notifications.addNotificationResponseReceivedListener(openNotification);
    void register().catch(() => {});
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        openNotification(response);
        void Notifications.clearLastNotificationResponseAsync();
      }
    }).catch(() => {});
    return () => { tokenListener?.remove(); responseListener.remove(); };
  }, [identityId]);
}

export async function signOutWithPushCleanup() {
  if (!supabase) return;
  if (Platform.OS !== "web") {
    try {
      const id = await SecureStore.getItemAsync(installationKey);
      if (id) await revokeMyExpoPushToken(supabase, id);
    } catch { /* Auth sign-out still works offline. */ }
  }
  return supabase.auth.signOut();
}

export async function scheduleDoctorLocalNotification(title: string, body: string) {
  if (Platform.OS === "web" || !Notifications) return;
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;
  await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
}
