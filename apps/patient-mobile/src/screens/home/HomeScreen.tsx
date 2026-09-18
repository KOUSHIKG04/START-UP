import { useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell, ChevronLeft, Search, X } from "lucide-react-native";
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
import { NotificationDrawer } from "../../components/NotificationDrawer";
import { useTypewriterPlaceholder } from "../../hooks/useTypewriterPlaceholder";
import {
  COLLAPSE_DISTANCE,
  CONTENT_TOP,
  EXPANDED_HEADER_HEIGHT,
  SEARCH_HEIGHT,
  SEARCH_OVERLAP,
  getHeaderAnimationStyles,
} from "../../utils/headerConstants";

function getFindDoctorRoute(consultationType: string) {
  return {
    pathname: "/find-doctor",
    params: { consultationType },
  } as unknown as Href;
}

const ALL_SPECIALITIES = [
  "General Physician",
  "Dermatologist",
  "Cardiologist",
  "Pediatrician",
  "Orthopedic",
  "Gynecologist",
  "ENT Specialist",
  "Neurologist",
  "Dentist",
] as const;

export function HomeScreen({
  onNotificationPress,
}: {
  onNotificationPress?: () => void;
} = {}) {
  const { top: topInset } = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchPlaceholder = useTypewriterPlaceholder();

  const { collapsedHeight, expandedHeaderStyle, searchStyle } =
    getHeaderAnimationStyles(scrollY, topInset);

  // Intercept Android hardware back press so hitting back navigation
  // returns to the home page instead of exiting the app
  useEffect(() => {
    if (!isSearchActive) return;

    const onBackPress = () => {
      handleCloseSearch();
      return true; // prevent exiting the app
    };

    const backHandlerSubscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );

    return () => backHandlerSubscription.remove();
  }, [isSearchActive]);

  const handleOpenSearch = () => {
    if (isSearchActive) return;
    setIsSearchActive(true);
    Animated.timing(scrollY, {
      toValue: COLLAPSE_DISTANCE,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const handleCloseSearch = () => {
    Keyboard.dismiss();
    searchInputRef.current?.blur();
    setIsSearchActive(false);
    setSearchQuery("");
    Animated.timing(scrollY, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const handleSelectItem = (term: string) => {
    Keyboard.dismiss();
    router.push({
      pathname: "/doctor-results",
      params: { symptom: term, consultationType: "Clinic Visit" },
    } as unknown as Href);
  };

  // Live filtered results when user is typing
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const liveResults = trimmedQuery
    ? ALL_SPECIALITIES.filter((title) =>
        title.toLowerCase().includes(trimmedQuery)
      ).map((title) => ({ title, type: "Speciality" as const }))
    : [];

  // 4px below the collapsed search bar for search content
  const searchActivePaddingTop = topInset + 68 + 4;

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
          </View>
        </SafeAreaView>
      </Animated.View>

      <FadedScrollView
        contentContainerStyle={[
          styles.content,
          isSearchActive && { paddingTop: searchActivePaddingTop },
        ]}
        containerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        topEdgeOffset={collapsedHeight}
        onScroll={
          isSearchActive
            ? undefined
            : Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false }
              )
        }
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {isSearchActive ? (
          <View style={styles.searchActiveContent}>
            {trimmedQuery ? (
              <View style={styles.liveResultsContainer}>
                {liveResults.length > 0 ? (
                  liveResults.map((item) => (
                    <Pressable
                      key={item.title}
                      accessibilityLabel={`${item.title}, ${item.type}`}
                      accessibilityRole="button"
                      onPress={() => handleSelectItem(item.title)}
                      style={({ pressed }) => [
                        styles.liveResultRow,
                        pressed && styles.rowPressed,
                      ]}
                    >
                      <Search
                        color="#9ca3af"
                        size={18}
                        strokeWidth={1.8}
                        style={styles.rowIcon}
                      />
                      <View style={styles.rowContent}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <Text style={styles.itemSubtitle}>{item.type}</Text>
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <View style={styles.emptyResults}>
                    <Text style={styles.emptyText}>
                      No results found for "{searchQuery}".
                    </Text>
                    <Pressable
                      onPress={() => handleSelectItem(searchQuery.trim())}
                      style={styles.searchAnywayButton}
                    >
                      <Text style={styles.searchAnywayText}>
                        Search for "{searchQuery}"
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ) : null}
          </View>
        ) : (
          <>
            <View style={styles.actionsRow}>
              {homeActions.map((action) => (
                <IconLabel
                  key={action.key}
                  icon={action.icon}
                  label={action.label}
                  backgroundColor={colors.patient.primary}
                  iconColor={colors.patient.surface}
                  onPress={
                    action.consultationType
                      ? () =>
                          router.push(
                            getFindDoctorRoute(action.consultationType!)
                          )
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
          </>
        )}
      </FadedScrollView>

      <SafeAreaView
        edges={["top"]}
        pointerEvents="box-none"
        style={styles.fixedHeaderSafeArea}
      >
        <View pointerEvents="box-none" style={styles.headerControlsRow}>
          {isSearchActive ? (
            <Pressable
              accessibilityLabel="Go back to home"
              accessibilityRole="button"
              hitSlop={12}
              onPress={handleCloseSearch}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
            >
              <ChevronLeft color={colors.white} size={30} strokeWidth={2.5} />
            </Pressable>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          {!isSearchActive ? (
            <Pressable
              accessibilityLabel="Notifications"
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => {
                onNotificationPress?.();
                setIsNotificationOpen(true);
              }}
              style={({ pressed }) => [
                styles.notificationButton,
                pressed && styles.notificationButtonPressed,
              ]}
            >
              <Bell
                color={colors.patient.primaryDark}
                size={20}
                strokeWidth={1.9}
              />
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>

      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.searchWrap,
          {
            transform: searchStyle.transform,
            paddingLeft: isSearchActive ? 68 : 20,
            paddingRight: isSearchActive
              ? 20
              : scrollY.interpolate({
                  inputRange: [0, COLLAPSE_DISTANCE],
                  outputRange: [20, 74],
                  extrapolate: "clamp",
                }),
          },
        ]}
      >
        <SearchInput
          ref={searchInputRef}
          accessibilityLabel="Search specialities"
          containerStyle={styles.search}
          iconSize={18}
          inputStyle={styles.searchInput}
          onChangeText={setSearchQuery}
          onFocus={handleOpenSearch}
          onSubmitEditing={() => {
            if (searchQuery.trim()) {
              handleSelectItem(searchQuery.trim());
            }
          }}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.patient.muted}
          returnKeyType="search"
          value={searchQuery}
          rightAccessory={
            searchQuery ? (
              <Pressable
                accessibilityLabel="Clear text"
                hitSlop={12}
                onPress={() => setSearchQuery("")}
                style={{ padding: 4 }}
              >
                <X
                  color={colors.patient.primaryDark}
                  size={20}
                  strokeWidth={2.4}
                />
              </Pressable>
            ) : undefined
          }
        />
      </Animated.View>

      <NotificationDrawer
        visible={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />
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
    height: 48,
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  greeting: {
    color: colors.white,
    fontFamily: fontFamilies.semibold,
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 34,
  },
  fixedHeaderSafeArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    elevation: 30,
    backgroundColor: "transparent",
  },
  headerControlsRow: {
    height: 48,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    width: 32,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPressed: {
    opacity: 0.7,
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
  notificationButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  searchWrap: {
    position: "absolute",
    top: EXPANDED_HEADER_HEIGHT - SEARCH_OVERLAP,
    right: 0,
    left: 0,
    zIndex: 10,
    elevation: 10,
  },
  search: {
    width: "100%",
    maxWidth: "100%",
    height: SEARCH_HEIGHT,
    gap: 10,
    paddingVertical: 0,
    borderWidth: 0.5,
    borderRadius: 24,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 3.85,
    elevation: 6,
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

  searchActiveContent: {
    paddingHorizontal: 4,
    paddingBottom: 20,
  },
  liveResultsContainer: {
    paddingTop: 4,
  },
  liveResultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f2f4",
  },
  rowPressed: {
    backgroundColor: "#f9fafb",
  },
  rowIcon: {
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
    justifyContent: "center",
  },
  itemTitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 15,
    fontWeight: "500",
    color: colors.patient.text,
    lineHeight: 20,
  },
  itemSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: "#788292",
    marginTop: 2,
    lineHeight: 16,
  },
  emptyResults: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    color: colors.patient.muted,
  },
  searchAnywayButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.patient.surface,
  },
  searchAnywayText: {
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    color: colors.patient.primaryDark,
  },
});
