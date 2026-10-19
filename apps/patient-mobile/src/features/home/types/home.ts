import type { SearchResultItem } from "./home-search-results";

import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import type { IconLabelIconProps } from "@startup/mobile-ui";
import type { ConsultationType } from "../../appointments/types/appointment";

export type HomeSearchOverlayProps = {
  visible: boolean;
  onClose: () => void;
  selectedCity?: string;
};

export type AmbulanceBannerProps = {
  onBookPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export type PopularService = {
  key: string;
  label: string;
  icon: LucideIcon;
  iconColor: string;
  backgroundColor: string;
};

export type PopularServicesProps = {
  services?: readonly PopularService[];
  onSeeAllPress?: () => void;
  onServicePress?: (service: PopularService) => void;
};

export type HomeAction = {
  key: "doctor" | "home" | "lab" | "consultation";
  label: string;
  icon: (props: IconLabelIconProps) => ReactNode;
  consultationType?: ConsultationType;
};

export type SearchItem = {
  id: string;
  title: string;
  type: "Speciality" | "Symptom" | "Doctor";
};

export type HomeSearchResultsProps = {
  liveResults: SearchResultItem[];
  searchQuery: string;
  onSelectItem: (item: string) => void;
};
