import { Animated, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Bell } from "lucide-react-native";
import {
  colors,
  fontFamilies,
  gradients,
  shadows,
} from "@startup/design-tokens";
import { SafeAreaView, SearchInput } from "@startup/mobile-ui";
import {
  EXPANDED_HEADER_HEIGHT,
  SEARCH_OVERLAP,
  SEARCH_HEIGHT,
} from "../data/homeLayout";
import type { useCollapsingHeader } from "../hooks/useCollapsingHeader";

type HomeSearchHeaderProps = { header: ReturnType<typeof useCollapsingHeader> };

export function HomeSearchHeader({ header }: HomeSearchHeaderProps) {
  return (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={gradients.patientBanner.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.collapsedHeader, { height: header.collapsedHeight }]}
      />

      <Animated.View
        pointerEvents="none"
        style={[styles.expandedHeader, header.expandedHeaderStyle]}
      >
        <LinearGradient
          colors={gradients.patientBanner.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
          <View style={styles.headerRow}>
            <Text style={styles.greeting}>Good Morning 👋</Text>

            <View style={styles.notificationButton}>
              <Bell
                color={colors.patient.primaryDark}
                size={20}
                strokeWidth={1.9}
              />
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>

      <Animated.View style={[styles.searchWrap, header.searchStyle]}>
        <SearchInput
          accessibilityLabel="Search doctors and services"
          containerStyle={styles.search}
          iconSize={18}
          inputStyle={styles.searchInput}
          placeholder="Search doctors, services..."
          placeholderTextColor={colors.patient.muted}
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  collapsedHeader: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    zIndex: 2,
  },
  expandedHeader: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    zIndex: 3,
    height: EXPANDED_HEADER_HEIGHT,
    overflow: "hidden",
  },
  safeArea: {
    backgroundColor: "transparent",
  },
  headerRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  greeting: {
    color: colors.white,
    fontFamily: fontFamilies.semibold,
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 34,
  },
  notificationButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  searchWrap: {
    position: "absolute",
    top: EXPANDED_HEADER_HEIGHT - SEARCH_OVERLAP,
    right: 0,
    left: 0,
    zIndex: 4,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  search: {
    maxWidth: 362,
    height: SEARCH_HEIGHT,
    gap: 10,
    paddingVertical: 0,
    borderWidth: 0,
    borderRadius: 24,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 3.85,
    elevation: 4,
  },
  searchInput: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 18,
  },
});
