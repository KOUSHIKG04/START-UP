import type { ReactNode } from "react";
import type { ModalProps, StyleProp, ViewStyle } from "react-native";

export type ModalSurfaceProps = Omit<
  ModalProps,
  "children" | "onRequestClose"
> & {
  children: ReactNode;
  onClose?: () => void;
  layout?: "dialog" | "custom";
  dismissOnBackdrop?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};
