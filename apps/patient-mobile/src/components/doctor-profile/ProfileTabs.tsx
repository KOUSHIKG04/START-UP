import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import { profileTabs } from "../../utils/doctorProfileConstants";
import type { ProfileTabsProps } from "../../types/doctor-profile";

export function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  return (
    <View accessibilityRole="tablist" style={styles.tabs}>
      {profileTabs.map((tab) => {
        const selected = activeTab === tab;
        const label = tab === "about" ? "About" : "Book Slots";
        return (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onTabChange(tab)}
            style={({ pressed }) => [
              styles.tab,
              selected ? styles.activeTab : undefined,
              pressed ? styles.pressed : undefined,
            ]}
          >
            <Text style={[styles.tabLabel, selected && styles.activeTabLabel]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    minHeight: 44,
    flexDirection: "row",
    padding: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: colors.patient.primaryDark,
  },
  tabLabel: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    fontWeight: "500",
  },
  activeTabLabel: {
    color: colors.white,
    fontFamily: fontFamilies.bold,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.76,
  },
});
