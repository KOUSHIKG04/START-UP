import type React from "react";
import type { ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";

export type NavItem = {
  key: string;
  label: string;
  icon?: LucideIcon;
  badge?: number | string;
};

export type BottomNavBarProps = {
  items: NavItem[];
  activeTab: string;
  onTabChange: (key: string) => void;
  showSOS?: boolean;
  onSOSPress?: () => void;
  renderCenterButton?: () => React.ReactNode;
  style?: ViewStyle;
};
