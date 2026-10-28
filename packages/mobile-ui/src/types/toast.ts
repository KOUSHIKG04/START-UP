import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export type ToastState = "pending" | "success" | "error" | "warning" | "info";

export type ToastType = Exclude<ToastState, "pending">;

export type ToastSide = "top" | "bottom";

export type ToastAlign = "start" | "center" | "end" | "left" | "right";

export type ToastPosition = `${ToastSide}-${ToastAlign}`;

export type ToastAction = { label: string; run: () => void };

/** title/message retains the mobile API; message/description accepts the reference API. */
export type ToastInput = {
  id?: string;
  description?: string;
  state?: ToastState;
  type?: ToastType;
  action?: ToastAction;
  lifetime?: number;
} & (
  { title: string; message?: string } | { title?: undefined; message: string }
);

export type Note = ToastInput & { id: string };

export type ToastClock = { waits: Map<string, number>; since: number | null };

export type StackSlot = { y: number; scale: number; opacity: number };

export type StackCard = { id: string; render: (behind: boolean) => ReactNode };

export type ToastsProps = {
  position?: ToastPosition;
  colorScheme?: "light" | "dark";
  style?: StyleProp<ViewStyle>;
  cardStyle?: StyleProp<ViewStyle>;
};
