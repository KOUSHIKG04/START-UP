import { type ImageStyle } from "react-native";
import type { ActiveAmbulanceTracking } from "@startup/contracts";

export type Props = {
  location: ActiveAmbulanceTracking | null;
  style: ImageStyle;
};
