import { NotificationDrawer as SharedNotificationDrawer } from "@startup/mobile-ui";
import { useNotificationDrawer } from "../hooks/useNotificationDrawer";
import type { NotificationDrawerProps } from "../types/notifications";

export type { NotificationDrawerProps } from "../types/notifications";
export type { NotificationItem } from "@startup/mobile-ui";

export function NotificationDrawer({
  visible,
  onClose,
}: NotificationDrawerProps) {
  const drawer = useNotificationDrawer({ visible, onClose });
  return (
    <SharedNotificationDrawer
      theme="driver"
      visible={visible}
      onClose={onClose}
      {...drawer}
    />
  );
}
