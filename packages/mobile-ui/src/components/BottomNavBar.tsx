import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  type ViewStyle,
  type LayoutChangeEvent,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@startup/design-tokens";
import type { LucideIcon } from "lucide-react-native";
import { cn } from "cn";
import { SOSButton } from "./SOSButton";
import { getNotchedBarPath } from "../utils/notchedBarPath";
import {
  BOTTOM_NAV_BAR_DEFAULT_WIDTH,
  BOTTOM_NAV_BAR_HEIGHT,
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
      className="absolute right-0 bottom-2.5 left-0 items-center px-1"
      style={{
        paddingBottom: Math.max(
          insets.bottom,
          BOTTOM_NAV_BAR_MIN_BOTTOM_PADDING
        ),
      }}
      pointerEvents="box-none"
    >
      <View
        onLayout={hasCenterAction ? handleLayout : undefined}
        className={cn(
          "relative w-full max-w-[390px]",
          !hasCenterAction &&
            "border-navigation-border bg-surface rounded-[32px] border-[1.5px]"
        )}
        style={[
          { height: BOTTOM_NAV_BAR_HEIGHT },
          !hasCenterAction && BOTTOM_NAV_BAR_SHADOW,
          style,
        ]}
      >
        {hasCenterAction && (
          <View className="absolute inset-0" pointerEvents="none">
            <Svg width={barWidth} height={BOTTOM_NAV_BAR_HEIGHT}>
              <Path
                d={pathData}
                fill={colors.white}
                stroke={colors.navigation.border}
                strokeWidth={1.5}
              />
            </Svg>
          </View>
        )}

        <View className="absolute inset-0 z-20 flex-row items-center justify-between rounded-[32px] px-2.5">
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
              <View className="h-full flex-[0.8]" pointerEvents="none" />
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
          <View
            className="absolute -top-[22px] right-0 left-0 z-50 items-center justify-center"
            pointerEvents="box-none"
          >
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

  return (
    <TouchableOpacity
      className="h-full min-w-0 flex-1 items-center justify-center px-0.5"
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View
        className={cn(
          "relative items-center justify-center rounded-[14px] px-3 py-1",
          isActive && "bg-patient-surface"
        )}
      >
        {Icon && (
          <Icon
            size={20}
            color={isActive ? colors.brand : colors.navigation.inactive}
            strokeWidth={isActive ? 2.3 : 1.8}
          />
        )}
        {item.badge !== undefined && (
          <View className="bg-sos-primary absolute -top-0.5 right-0.5 h-3.5 min-w-[14px] items-center justify-center rounded-[7px] px-[3px]">
            <Text className="text-on-primary text-[9px] font-extrabold">
              {item.badge}
            </Text>
          </View>
        )}
      </View>

      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        className={cn(
          "mt-1 text-center text-[10px] tracking-[0px]",
          isActive
            ? "text-brand font-bold"
            : "text-navigation-inactive font-medium"
        )}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}
