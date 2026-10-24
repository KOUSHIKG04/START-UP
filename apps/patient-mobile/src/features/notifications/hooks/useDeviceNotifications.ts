import { useEffect } from "react";
import { Platform } from "react-native";
import type { ToastInput } from "@startup/mobile-ui";
import {
  Notifications as notificationModule,
  register,
  openNotification,
} from "../services/deviceNotifications";

const Notifications = notificationModule;

export function useDeviceNotifications(
  identityId: string | undefined,
  showToast: (input: ToastInput) => void
) {
  useEffect(() => {
    if (!identityId || !Notifications || Platform.OS === "web") return;
    let active = true;
    const tokenListener = Notifications.addPushTokenListener(() => {
      void register().catch(() => {});
    });

    const responseListener =
      Notifications.addNotificationResponseReceivedListener(openNotification);
    const foregroundListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        const { title, body } = notification.request.content;
        showToast({
          title: title ?? "Notification",
          message: body ?? undefined,
          type: title?.toLowerCase().includes("confirmed") ? "success" : "info",
        });
      }
    );

    void register().catch(() => {});

    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (active && response) {
          openNotification(response);
          void Notifications.clearLastNotificationResponseAsync();
        }
      })
      .catch(() => {});

    return () => {
      active = false;
      tokenListener?.remove();
      responseListener.remove();
      foregroundListener.remove();
    };
  }, [identityId, showToast]);
}
