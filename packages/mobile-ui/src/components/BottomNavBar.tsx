import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  type ViewStyle,
  type LayoutChangeEvent,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing } from "@startup/design-tokens";
import type { LucideIcon } from "lucide-react-native";
import { SOSButton } from "./SOSButton";
import { getNotchedBarPath } from "../utils/notchedBarPath";

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

export function BottomNavBar({
  items,
  activeTab,
  onTabChange,
  showSOS = false,
  onSOSPress,
  renderCenterButton,
  style,
}: BottomNavBarProps) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(360);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0 && Math.abs(width - barWidth) > 1) {
      setBarWidth(width);
    }
  };

  const barHeight = 72;
  const hasCenterAction = showSOS || Boolean(renderCenterButton);
  const pathData = hasCenterAction
    ? getNotchedBarPath(barWidth, barHeight)
    : "";

  // Center-action layouts split tabs around the notch.
  const half = Math.ceil(items.length / 2);
  const leftItems = items.slice(0, half);
  const rightItems = items.slice(half);

  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: Math.max(insets.bottom, spacing.xs) },
      ]}
      pointerEvents="box-none"
    >
      <View
        onLayout={hasCenterAction ? handleLayout : undefined}
        style={[
          styles.floatingBar,
          hasCenterAction ? styles.notchedBar : styles.plainBar,
          style,
        ]}
      >
        {hasCenterAction && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width={barWidth} height={barHeight}>
              <Path
                d={pathData}
                fill={colors.white}
                stroke="#E2E8F0"
                strokeWidth={1.5}
              />
            </Svg>
          </View>
        )}

        <View style={styles.tabsRow}>
          {hasCenterAction ? (
            <>
              {leftItems.map((item) => (
                <TabButton
                  key={item.key}
                  item={item}
                  isActive={activeTab === item.key}
                  onPress={() => onTabChange?.(item.key)}
                />
              ))}
              <View style={styles.centerSpacer} pointerEvents="none" />
              {rightItems.map((item) => (
                <TabButton
                  key={item.key}
                  item={item}
                  isActive={activeTab === item.key}
                  onPress={() => onTabChange?.(item.key)}
                />
              ))}
            </>
          ) : (
            items.map((item) => (
              <TabButton
                key={item.key}
                item={item}
                isActive={activeTab === item.key}
                onPress={() => onTabChange?.(item.key)}
              />
            ))
          )}
        </View>

        {hasCenterAction && (
          <View style={styles.elevatedCenterWrapper} pointerEvents="box-none">
            {renderCenterButton ? (
              renderCenterButton()
            ) : (
              <SOSButton
                size={64}
                onLongPress={() => {
                  onSOSPress?.();
                  onTabChange("sos");
                }}
                onPress={() => {
                  // Quick tap does not trigger emergency.
                }}
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

type TabButtonProps = {
  item: NavItem;
  isActive: boolean;
  onPress: () => void;
};

function TabButton({ item, isActive, onPress }: TabButtonProps) {
  const Icon = item.icon;

  return (
    <TouchableOpacity
      style={styles.tabButton}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={[styles.iconWrapper, isActive && styles.activeIconWrapper]}>
        {Icon && (
          <Icon
            size={20}
            color={isActive ? colors.brand : styles.inactiveText.color}
            strokeWidth={isActive ? 2.3 : 1.8}
          />
        )}
        {item.badge !== undefined && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
      </View>

      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[
          styles.label,
          isActive ? styles.activeLabel : styles.inactiveText,
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  floatingBar: {
    width: "100%",
    maxWidth: 390,
    height: 72,
    position: "relative",
    backgroundColor: "transparent",
  },
  notchedBar: {
    backgroundColor: "transparent",
  },
  plainBar: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 32,
    shadowColor: "#0C2434",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  tabsRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    zIndex: 20,
    borderRadius: 32,
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  centerSpacer: {
    flex: 0.8,
    height: "100%",
  },
  iconWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  activeIconWrapper: {
    backgroundColor: colors.patient.surface,
    borderRadius: radius.md,
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 0,
    textAlign: "center",
  },
  activeLabel: {
    color: colors.brand,
    fontWeight: "700",
  },
  inactiveText: {
    color: "#8E9BAE",
    fontWeight: "500",
  },
  elevatedCenterWrapper: {
    position: "absolute",
    top: -22,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: 2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.patient.sos.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: "800",
  },
});
