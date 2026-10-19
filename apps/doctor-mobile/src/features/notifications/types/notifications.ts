import type { NotificationDrawerProps as SharedNotificationDrawerProps } from "@startup/mobile-ui";

export type NotificationDrawerProps = Pick<
  SharedNotificationDrawerProps,
  "visible" | "onClose"
>;
