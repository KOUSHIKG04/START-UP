import { useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell } from "lucide-react-native";
import {
  colors,
  fontFamilies,
  gradients,
  shadows,
} from "@startup/design-tokens";
import {
  FadedScrollView,
  IconLabel,
  SafeAreaView,
  SearchInput,
} from "@startup/mobile-ui";
import { homeActions } from "../../utils/HomeActions";
import AmbulanceBanner from "../../components/AmbulanceBanner";
import UpcomingAppointmentCard from "../../components/UpcomingAppointmentCard";
import PopularServices from "../../components/PopularServices";

const EXPANDED_HEADER_HEIGHT = 165;
const COLLAPSED_HEADER_HEIGHT = 88;
const SEARCH_HEIGHT = 48;
const SEARCH_OVERLAP = 22;
const COLLAPSE_DISTANCE = 64;
const CONTENT_TOP =
  EXPANDED_HEADER_HEIGHT - SEARCH_OVERLAP + SEARCH_HEIGHT + 18;

function getFindDoctorRoute(consultationType: string) {
  return {
    pathname: "/find-doctor",
    params: { consultationType },
  } as unknown as Href;
}

export function HomeScreen() {
  const { top: topInset } = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const collapsedHeight = topInset + COLLAPSED_HEADER_HEIGHT;
  const searchStartTop = EXPANDED_HEADER_HEIGHT - SEARCH_OVERLAP;
  const searchEndTop = topInset + 20;

  const expandedHeaderStyle = {
    opacity: scrollY.interpolate({
      inputRange: [0, COLLAPSE_DISTANCE * 0.72],
      outputRange: [1, 0],
      extrapolate: "clamp" as const,
    }),
    transform: [
      {
        translateY: scrollY.interpolate({
          inputRange: [0, COLLAPSE_DISTANCE],
          outputRange: [0, -24],
          extrapolate: "clamp",
        }),
      },
    ],
  };
  const searchStyle = {
    transform: [
      {
        translateY: scrollY.interpolate({
          inputRange: [0, COLLAPSE_DISTANCE],
          outputRange: [0, searchEndTop - searchStartTop],
          extrapolate: "clamp",
        }),
      },
    ],
  };

  return (
    <View style={styles.screen}>
      <LinearGradient
        pointerEvents="none"
        colors={gradients.patientBanner.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.collapsedHeader, { height: collapsedHeight }]}
      />

      <Animated.View
        pointerEvents="none"
        style={[styles.expandedHeader, expandedHeaderStyle]}
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

      <Animated.View style={[styles.searchWrap, searchStyle]}>
        <SearchInput
          accessibilityLabel="Search doctors and services"
          containerStyle={styles.search}
          iconSize={18}
          inputStyle={styles.searchInput}
          placeholder="Search doctors, services..."
          placeholderTextColor={colors.patient.muted}
        />
      </Animated.View>

      <FadedScrollView
        contentContainerStyle={styles.content}
        containerStyle={styles.scrollContainer}
        edgeColor={colors.white}
        topEdgeOffset={collapsedHeight}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.actionsRow}>
          {homeActions.map((action) => (
            <IconLabel
              key={action.key}
              icon={action.icon}
              label={action.label}
              onPress={
                action.consultationType
                  ? () =>
                      router.push(getFindDoctorRoute(action.consultationType!))
                  : undefined
              }
              surfaceSize={52}
              surfaceRadius={16}
              iconSize={24}
              labelWidth={76}
              gap={8}
              labelNumberOfLines={2}
              labelStyle={styles.actionLabel}
            />
          ))}
        </View>

        <View style={styles.ambulanceBanner}>
          <AmbulanceBanner
            onBookPress={() => router.push("/ambulance" as unknown as Href)}
          />
        </View>
        <UpcomingAppointmentCard />
        <PopularServices />
      </FadedScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
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
  content: {
    paddingTop: CONTENT_TOP,
    paddingHorizontal: 14,
    paddingBottom: 120,
    gap: 14,
  },
  scrollContainer: {
    ...StyleSheet.absoluteFill,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    gap: 8,
    marginTop: 2,
  },
  actionLabel: {
    color: colors.patient.text,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  },
  ambulanceBanner: {
    marginTop: 10,
    alignItems: "center",
  },
});
