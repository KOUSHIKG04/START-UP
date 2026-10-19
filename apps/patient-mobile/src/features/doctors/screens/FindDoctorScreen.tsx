import { useFindDoctor } from "../hooks/useFindDoctor";
import { getDoctorResultsRoute } from "../utils/doctorRoutes";
import { AppText as Text } from "@startup/mobile-ui";

import { Animated, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, type Href } from "expo-router";

import { ChevronLeft, Mic, X } from "lucide-react-native";
import {
  colors,
  fontFamilies,
  gradients,
  radius,
  spacing,
} from "@startup/design-tokens";
import { FadedScrollView, SafeAreaView, SearchInput } from "@startup/mobile-ui";
import { COLLAPSE_DISTANCE } from "../../../utils/headerConstants";

import {
  CONTENT_TOP,
  EXPANDED_HEADER_HEIGHT,
  SEARCH_END_TOP_OFFSET,
  SEARCH_OVERLAP,
} from "../utils/findDoctorConstants";
import { FindDoctorCategories } from "../components/FindDoctorCategories";
import { FindDoctorSearchList } from "../components/FindDoctorSearchList";
import { BookingGuideLink } from "../components/BookingGuideLink";

import type { FindDoctorScreenProps } from "../types/find-doctor";

export function FindDoctorScreen({
  consultationType,
  onBackPress,
}: FindDoctorScreenProps) {
  const {
    isSearchActive,
    searchQuery,
    setSearchQuery,
    searchPlaceholder,
    recentSearches,
    rememberSearch,
    clearRecentSearches,
    searchInputRef,
    scrollY,
    collapsedHeight,
    expandedHeaderStyle,
    searchStyle,
    handleOpenSearch,
    handleCloseSearch,
    handleBack,
    doctorMatches,
    filteredCategories,
    searchActivePaddingTop,
  } = useFindDoctor({ consultationType, onBackPress });
  const openResults = (term: string) => {
    rememberSearch(term);
    if (isSearchActive) handleCloseSearch();
    router.push(getDoctorResultsRoute(term, consultationType));
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
          pointerEvents="none"
          colors={gradients.patientBanner.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
          <View style={styles.headerTitleContainer}>
            <Text variant="screenTitle" style={styles.headerTitle}>
              What are you feeling?
            </Text>
          </View>
        </SafeAreaView>
      </Animated.View>

      <SafeAreaView
        edges={["top"]}
        pointerEvents="box-none"
        style={styles.fixedHeaderSafeArea}
      >
        <View pointerEvents="box-none" style={styles.backButtonRow}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={12}
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <ChevronLeft color={colors.white} size={30} strokeWidth={2.5} />
          </Pressable>
        </View>
      </SafeAreaView>

      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.searchWrap,
          {
            transform: searchStyle.transform,
            paddingLeft: isSearchActive
              ? 68
              : scrollY.interpolate({
                  inputRange: [0, COLLAPSE_DISTANCE],
                  outputRange: [20, 68],
                  extrapolate: "clamp",
                }),
          },
        ]}
      >
        <Animated.View
          style={{
            width: "100%",
            height: scrollY.interpolate({
              inputRange: [0, COLLAPSE_DISTANCE],
              outputRange: [48, 44],
              extrapolate: "clamp",
            }),
          }}
        >
          <SearchInput
            ref={searchInputRef}
            accessibilityLabel="Search by symptoms or speciality"
            containerStyle={styles.search}
            iconSize={18}
            inputStyle={styles.searchInput}
            onChangeText={setSearchQuery}
            onFocus={handleOpenSearch}
            onSubmitEditing={() => {
              if (searchQuery.trim()) {
                openResults(searchQuery.trim());
              }
            }}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.patient.muted}
            returnKeyType="search"
            value={searchQuery}
            rightAccessory={
              searchQuery ? (
                <Pressable
                  accessibilityLabel="Clear search"
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
              ) : (
                <Mic
                  color={colors.patient.primaryDark}
                  size={19}
                  strokeWidth={2}
                />
              )
            }
          />
        </Animated.View>
      </Animated.View>

      <FadedScrollView
        contentContainerStyle={[
          styles.content,
          isSearchActive && { paddingTop: searchActivePaddingTop },
        ]}
        containerStyle={styles.scrollContainer}
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
        bounces={true}
        alwaysBounceVertical={true}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!isSearchActive ? (
          <>
            <BookingGuideLink
              onPress={() =>
                router.push({
                  pathname: "/learn-booking",
                  params: { consultationType },
                } as Href)
              }
            />
            <FindDoctorCategories
              onSelectCategory={(_key, label) => {
                openResults(label);
              }}
            />
          </>
        ) : (
          <FindDoctorSearchList
            filteredCategories={filteredCategories}
            doctorMatches={doctorMatches}
            searchQuery={searchQuery}
            recentSearches={recentSearches}
            onSelectSymptom={openResults}
            onSelectRecent={openResults}
            onClearRecentSearches={clearRecentSearches}
            onSelectDoctor={(name) => {
              openResults(name);
            }}
            onSelectCategory={(_key, label) => {
              openResults(label);
            }}
            onSearchAnyway={(query) => {
              openResults(query);
            }}
          />
        )}
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
    height: EXPANDED_HEADER_HEIGHT - SEARCH_OVERLAP,
    backgroundColor: "transparent",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 56,
    transform: [{ translateY: -4 }],
  },
  headerTitle: {
    color: colors.white,
    fontFamily: fontFamilies.semibold,
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 28,
  },
  fixedHeaderSafeArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    backgroundColor: "transparent",
  },
  backButtonRow: {
    height: 44,
    marginTop: SEARCH_END_TOP_OFFSET,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 20,
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
  searchWrap: {
    position: "absolute",
    top: EXPANDED_HEADER_HEIGHT - SEARCH_OVERLAP,
    right: 0,
    left: 0,
    zIndex: 4,
    paddingRight: 20,
  },
  search: {
    width: "100%",
    maxWidth: "100%",
    height: "100%",
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
    paddingHorizontal: spacing.lg,
    paddingBottom: 160,
    gap: spacing.xl,
  },
  scrollContainer: {
    ...StyleSheet.absoluteFill,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 18,
    fontWeight: "400",
    lineHeight: 23,
  },
  symptomsTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
  },
  chipList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    borderWidth: 0,
    backgroundColor: colors.patient.surface,
  },
  selectedChip: {
    backgroundColor: colors.patient.primaryDark,
  },
  chipLabel: {
    color: colors.patient.primaryDark,
  },
  selectedChipLabel: {
    color: colors.white,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: spacing.lg,
  },
  categoryItem: {
    width: "23%",
    alignItems: "center",
  },
  categoryItemPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.94 }],
  },
  categoryImage: {
    width: 58,
    height: 58,
  },
  categoryLabel: {
    color: colors.patient.text,
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 14,
    textAlign: "center",
    marginTop: 6,
  },
  showAllButton: {
    width: "100%",
    marginTop: spacing.md,
  },
  searchActiveList: {
    paddingTop: spacing.xs,
    paddingBottom: 120,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.patient.surfaceBorder,
  },
  categoryRowPressed: {
    backgroundColor: colors.patient.surface,
  },
  categoryRowImage: {
    width: 40,
    height: 40,
    marginRight: 14,
  },
  categoryRowContent: {
    flex: 1,
    justifyContent: "center",
  },
  categoryRowTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
    fontWeight: "600",
  },
  categoryRowSubtitle: {
    color: colors.patient.muted,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    marginTop: 2,
  },
  emptyResults: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    color: colors.patient.muted,
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    textAlign: "center",
  },
  searchAnywayButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.patient.surface,
  },
  searchAnywayText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
  },
});
