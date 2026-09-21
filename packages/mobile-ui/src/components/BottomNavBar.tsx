import { useMobileTheme } from "../theme/MobileThemeProvider";
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
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import type { LucideIcon } from "lucide-react-native";
import { SOSButton } from "./SOSButton";
import { getNotchedBarPath } from "../utils/notchedBarPath";
import {
  BOTTOM_NAV_BAR_DEFAULT_WIDTH,
  BOTTOM_NAV_BAR_HEIGHT,
  BOTTOM_NAV_BAR_MAX_WIDTH,
  BOTTOM_NAV_BAR_MIN_BOTTOM_PADDING,
  BOTTOM_NAV_BAR_SHADOW,
  BOTTOM_NAV_BAR_SOS_SIZE,
  BOTTOM_NAV_BAR_WIDTH_TOLERANCE,
  splitBottomNavItems,
} from "../utils/bottomNavBarConfig";

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
  const [barWidth, setBarWidth] = useState(BOTTOM_NAV_BAR_DEFAULT_WIDTH);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (
      width > 0 &&
      Math.abs(width - barWidth) > BOTTOM_NAV_BAR_WIDTH_TOLERANCE
    ) {
      setBarWidth(width);
    }
  };

  const hasCenterAction = showSOS || Boolean(renderCenterButton);
  const pathData = hasCenterAction
    ? getNotchedBarPath(barWidth, BOTTOM_NAV_BAR_HEIGHT)
    : "";

  const { leftItems, rightItems } = splitBottomNavItems(items);

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom: Math.max(
            insets.bottom,
            BOTTOM_NAV_BAR_MIN_BOTTOM_PADDING
          ),
        },
      ]}
      pointerEvents="box-none"
    >
      <LinearGradient
        colors={[colors.ui.navFadeStart, colors.ui.navFadeEnd]}
        pointerEvents="none"
        style={styles.navFade}
      />
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
            <Svg width={barWidth} height={BOTTOM_NAV_BAR_HEIGHT}>
              <Path
                d={pathData}
                fill={colors.white}
                stroke={colors.ui.navBorder}
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
                size={BOTTOM_NAV_BAR_SOS_SIZE}
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
  const theme = useMobileTheme();

  return (
    <TouchableOpacity
      style={styles.tabButton}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={
        item.badge !== undefined
          ? `${item.label}, ${item.badge} ${String(item.badge) === "1" ? "notification" : "notifications"}`
          : item.label
      }
    >
      <View
        style={[
          styles.iconWrapper,
          isActive && [
            styles.activeIconWrapper,
            { backgroundColor: theme.soft },
          ],
        ]}
      >
        {Icon && (
          <Icon
            size={20}
            color={isActive ? theme.primary : styles.inactiveText.color}
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
          isActive
            ? [styles.activeLabel, { color: theme.primary }]
            : styles.inactiveText,
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
  navFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -10,
    height: 118,
  },
  floatingBar: {
    width: "100%",
    maxWidth: BOTTOM_NAV_BAR_MAX_WIDTH,
    height: BOTTOM_NAV_BAR_HEIGHT,
    position: "relative",
    backgroundColor: "transparent",
  },
  notchedBar: {
    backgroundColor: "transparent",
  },
  plainBar: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.ui.navBorder,
    borderRadius: 32,
    ...BOTTOM_NAV_BAR_SHADOW,
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
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 0,
    textAlign: "center",
  },
  activeLabel: {
    color: colors.brand,
    fontFamily: fontFamilies.bold,
    fontWeight: "700",
  },
  inactiveText: {
    color: colors.ui.navMuted,
    fontFamily: fontFamilies.medium,
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
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    fontWeight: "800",
  },
});
