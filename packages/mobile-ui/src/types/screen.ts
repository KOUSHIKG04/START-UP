import type { PropsWithChildren } from "react";
import type { ViewProps } from "react-native";
import type { Edge } from "react-native-safe-area-context";

export type ScreenProps = PropsWithChildren<
  ViewProps & {
    /** Edges to apply safe area padding. Defaults to ['top'] */
    edges?: readonly Edge[];
    className?: string;
  }
>;
