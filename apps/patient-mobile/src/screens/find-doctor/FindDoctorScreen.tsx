import { useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Mic, X } from "lucide-react-native";
import {
  colors,
  fontFamilies,
  gradients,
  radius,
  shadows,
  spacing,
} from "@startup/design-tokens";
import {
  Button,
  Chip,
  FadedScrollView,
  SafeAreaView,
  SearchInput,
} from "@startup/mobile-ui";
import {
  COLLAPSE_DISTANCE,
  getHeaderAnimationStyles,
} from "../../utils/headerConstants";
import type { ConsultationType } from "../../types/appointment";
import {
  COLLAPSED_HEADER_H,
  CONTENT_TOP,
  EXPANDED_HEADER_HEIGHT,
  SEARCH_END_TOP_OFFSET,
  SEARCH_OVERLAP,
  categories,
  getDoctorResultsRoute,
  symptoms,
} from "../../utils/findDoctorConstants";

import type { FindDoctorScreenProps } from "../../types/find-doctor";

export function FindDoctorScreen({
  consultationType,
  onBackPress,
}: FindDoctorScreenProps) {
  const [selectedSymptom, setSelectedSymptom] = useState<string>();
  const [selectedCategory, setSelectedCategory] = useState("fever");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<TextInput>(null);

  const { top: topInset } = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const searchEndTop = topInset + SEARCH_END_TOP_OFFSET;
  const { collapsedHeight, expandedHeaderStyle, searchStyle } =
    getHeaderAnimationStyles(scrollY, topInset, {
      expandedHeight: EXPANDED_HEADER_HEIGHT,
      searchOverlap: SEARCH_OVERLAP,
      collapsedHeight: COLLAPSED_HEADER_H,
      searchEndTop,
    });

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

  const handleBack = () => {
    if (isSearchActive) {
      handleCloseSearch();
      return;
    }
    if (onBackPress) {
      onBackPress();
      return;
    }
    router.back();
  };

  useEffect(() => {
    if (!isSearchActive) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleCloseSearch();
      return true;
    });
    return () => sub.remove();
  }, [isSearchActive]);

  const visibleCategories = showAllCategories
    ? categories
    : categories.slice(0, 8);

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const filteredCategories = trimmedQuery
    ? categories.filter(
        (c) =>
          c.label.toLowerCase().includes(trimmedQuery) ||
          c.key.toLowerCase().includes(trimmedQuery)
      )
    : categories;

  const searchActivePaddingTop = collapsedHeight + 8;

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
            <Text style={styles.headerTitle}>What are you feeling?</Text>
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
            accessibilityLabel="Describe what you're feeling"
            containerStyle={styles.search}
            iconSize={18}
            inputStyle={styles.searchInput}
            onChangeText={setSearchQuery}
            onFocus={handleOpenSearch}
            onSubmitEditing={() => {
              if (searchQuery.trim()) {
                handleCloseSearch();
                router.push(
                  getDoctorResultsRoute(searchQuery.trim(), consultationType)
                );
              }
            }}
            placeholder="Describe what you're feeling..."
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
            <View style={styles.section}>
              <Text style={styles.symptomsTitle}>Most searched symptoms</Text>
              <View style={styles.chipList}>
                {symptoms.map((symptom) => {
                  const selected = selectedSymptom === symptom;
                  return (
                    <Chip
                      key={symptom}
                      label={symptom}
                      onPress={() => {
                        setSelectedSymptom(selected ? undefined : symptom);
                        router.push(
                          getDoctorResultsRoute(symptom, consultationType)
                        );
                      }}
                      style={[
                        styles.chip,
                        selected ? styles.selectedChip : undefined,
                      ]}
                      labelStyle={[
                        styles.chipLabel,
                        selected ? styles.selectedChipLabel : undefined,
                      ]}
                    />
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Browse by categories</Text>
              <View style={styles.categoryGrid}>
                {visibleCategories.map((category) => (
                  <Pressable
                    key={category.key}
                    accessibilityRole="button"
                    accessibilityLabel={category.label.replace("\n", " ")}
                    onPress={() => {
                      setSelectedCategory(category.key);
                      router.push(
                        getDoctorResultsRoute(
                          category.label.replace("\n", " "),
                          consultationType
                        )
                      );
                    }}
                    style={({ pressed }) => [
                      styles.categoryItem,
                      pressed && styles.categoryItemPressed,
                    ]}
                  >
                    <Image
                      source={category.image}
                      style={[
                        styles.categoryImage,
                        category.imageScale
                          ? { transform: [{ scale: category.imageScale }] }
                          : undefined,
                      ]}
                      resizeMode="contain"
                    />
                    <Text numberOfLines={2} style={styles.categoryLabel}>
                      {category.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Button
                variant="outline"
                label={showAllCategories ? "Show Less" : "Show All Categories"}
                accessibilityLabel={
                  showAllCategories
                    ? "Show less categories"
                    : "Show all categories"
                }
                onPress={() => setShowAllCategories((prev) => !prev)}
                style={styles.showAllButton}
              />
            </View>
          </>
        ) : (
          <View style={styles.searchActiveList}>
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => (
                <Pressable
                  key={category.key}
                  accessibilityRole="button"
                  accessibilityLabel={category.label.replace("\n", " ")}
                  onPress={() => {
                    setSelectedCategory(category.key);
                    handleCloseSearch();
                    router.push(
                      getDoctorResultsRoute(
                        category.label.replace("\n", " "),
                        consultationType
                      )
                    );
                  }}
                  style={({ pressed }) => [
                    styles.categoryRow,
                    pressed && styles.categoryRowPressed,
                  ]}
                >
                  <Image
                    source={category.image}
                    style={[
                      styles.categoryRowImage,
                      category.imageScale
                        ? { transform: [{ scale: category.imageScale }] }
                        : undefined,
                    ]}
                    resizeMode="contain"
                  />
                  <View style={styles.categoryRowContent}>
                    <Text style={styles.categoryRowTitle}>
                      {category.label.replace("\n", " ")}
                    </Text>
                    <Text style={styles.categoryRowSubtitle}>Speciality</Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyResults}>
                <Text style={styles.emptyText}>
                  No categories found for "{searchQuery}".
                </Text>
                <Pressable
                  onPress={() => {
                    handleCloseSearch();
                    router.push(
                      getDoctorResultsRoute(
                        searchQuery.trim(),
                        consultationType
                      )
                    );
                  }}
                  style={styles.searchAnywayButton}
                >
                  <Text style={styles.searchAnywayText}>
                    Search for "{searchQuery}"
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
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
