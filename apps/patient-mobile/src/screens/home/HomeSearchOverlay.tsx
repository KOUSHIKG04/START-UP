import { useState } from "react";
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ChevronDown, Clock, MapPin, Search, Sparkles, X } from "lucide-react-native";
import { router } from "expo-router";
import { colors, fontFamilies } from "@startup/design-tokens";
import { Header, SearchInput } from "@startup/mobile-ui";
import {
  DEFAULT_SEARCH_CITY,
  INITIAL_RECENTS,
  POPULAR_SEARCHES,
  filterSearchDirectory,
  findSearchItem,
  getDoctorResultsSearchRoute,
  type SearchItem,
} from "../../utils/homeSearchConstants";

import type { HomeSearchOverlayProps } from "../../types/home";

export type { SearchItem, HomeSearchOverlayProps };

export function HomeSearchOverlay({
  visible,
  onClose,
  selectedCity = DEFAULT_SEARCH_CITY,
}: HomeSearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState<SearchItem[]>(() => [...INITIAL_RECENTS]);

  const trimmedQuery = query.trim().toLowerCase();
  const searchResults = filterSearchDirectory(query);

  const handleClose = () => {
    Keyboard.dismiss();
    setQuery("");
    onClose();
  };

  const handleSelectItem = (item: SearchItem) => {
    // Update recent searches
    setRecents((prev) => {
      const filtered = prev.filter(
        (r) => r.title.toLowerCase() !== item.title.toLowerCase()
      );
      return [item, ...filtered];
    });

    handleClose();
    router.push(getDoctorResultsSearchRoute(item.title));
  };

  const handleRemoveRecent = (id: string) => {
    setRecents((prev) => prev.filter((r) => r.id !== id));
  };

  const handleClearAll = () => {
    setRecents([]);
  };

  const handleSubmitEditing = () => {
    if (trimmedQuery) {
      const existing = findSearchItem(trimmedQuery);
      const itemToSelect: SearchItem = existing ?? {
        id: `custom-${Date.now()}`,
        title: query.trim(),
        type: "Symptom",
      };
      handleSelectItem(itemToSelect);
    }
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
      transparent={false}
      visible={visible}
    >
      <View style={styles.container}>
        <Header
          app="patient"
          onBackPress={handleClose}
          centerContent={
            <Pressable
              accessibilityLabel={`Location: ${selectedCity}. Tap to change`}
              accessibilityRole="button"
              hitSlop={8}
              style={styles.locationSelector}
            >
              <MapPin color={colors.white} size={18} strokeWidth={2} />
              <Text style={styles.locationText}>{selectedCity}</Text>
              <ChevronDown color={colors.white} size={16} strokeWidth={2.2} />
            </Pressable>
          }
        />

        <View style={styles.searchBarContainer}>
          <SearchInput
            autoFocus={true}
            containerStyle={styles.searchContainer}
            cursorColor={colors.patient.primary}
            iconColor={colors.patient.muted}
            inputStyle={styles.searchInput}
            onChangeText={setQuery}
            onSubmitEditing={handleSubmitEditing}
            placeholder="Search Symptoms / Specialities"
            placeholderTextColor="#8e95a2"
            returnKeyType="search"
            showIcon={false}
            value={query}
            rightAccessory={
              query ? (
                <Pressable
                  accessibilityLabel="Clear search text"
                  hitSlop={12}
                  onPress={() => setQuery("")}
                  style={styles.clearInputButton}
                >
                  <X color={colors.patient.primaryDark} size={20} strokeWidth={2.4} />
                </Pressable>
              ) : undefined
            }
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scrollBody}
        >
          {trimmedQuery ? (
            /* Live Search Results */
            <View style={styles.resultsContainer}>
              {searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityLabel={`${item.title}, ${item.type}`}
                    accessibilityRole="button"
                    onPress={() => handleSelectItem(item)}
                    style={({ pressed }) => [
                      styles.resultRow,
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
                    No results found for "{query}".
                  </Text>
                  <Pressable
                    onPress={handleSubmitEditing}
                    style={styles.searchAnywayButton}
                  >
                    <Text style={styles.searchAnywayText}>
                      Search for "{query}"
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            /* Recent Searches & Suggestions */
            <View>
              {recents.length > 0 && (
                <View style={styles.recentsSection}>
                  <View style={styles.recentsHeader}>
                    <Text style={styles.recentsHeaderText}>
                      Continue searching for...
                    </Text>
                    <Pressable
                      accessibilityLabel="Clear recent searches"
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={handleClearAll}
                    >
                      <Text style={styles.clearAllText}>CLEAR</Text>
                    </Pressable>
                  </View>

                  {recents.map((item, index) => (
                    <View key={item.id}>
                      <Pressable
                        accessibilityLabel={`${item.title}, ${item.type}`}
                        accessibilityRole="button"
                        onPress={() => handleSelectItem(item)}
                        style={({ pressed }) => [
                          styles.recentRow,
                          pressed && styles.rowPressed,
                        ]}
                      >
                        <Clock
                          color="#9ca3af"
                          size={18}
                          strokeWidth={1.8}
                          style={styles.rowIcon}
                        />
                        <View style={styles.rowContent}>
                          <Text style={styles.itemTitle}>{item.title}</Text>
                          <Text style={styles.itemSubtitle}>{item.type}</Text>
                        </View>
                        <Pressable
                          accessibilityLabel={`Remove ${item.title} from recents`}
                          hitSlop={10}
                          onPress={() => handleRemoveRecent(item.id)}
                          style={styles.removeRecentButton}
                        >
                          <X color="#9ca3af" size={17} strokeWidth={1.9} />
                        </Pressable>
                      </Pressable>
                      {index < recents.length - 1 && (
                        <View style={styles.divider} />
                      )}
                    </View>
                  ))}
                  <View style={styles.divider} />
                </View>
              )}

              {/* Suggestions / Popular Searches Section */}
              <View style={styles.suggestionsSection}>
                <View style={styles.suggestionsHeaderRow}>
                  <Sparkles
                    color={colors.patient.primaryDark}
                    size={16}
                    strokeWidth={2}
                  />
                  <Text style={styles.suggestionsHeaderText}>
                    Popular Searches
                  </Text>
                </View>

                <View style={styles.chipsWrap}>
                  {POPULAR_SEARCHES.map((item) => (
                    <Pressable
                      key={item.id}
                      accessibilityLabel={item.title}
                      accessibilityRole="button"
                      onPress={() => handleSelectItem(item)}
                      style={({ pressed }) => [
                        styles.chip,
                        pressed && styles.chipPressed,
                      ]}
                    >
                      <Text style={styles.chipText}>{item.title}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  locationSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  locationText: {
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
    fontWeight: "600",
    color: colors.white,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ebecee",
  },
  searchContainer: {
    width: "100%",
    maxWidth: "100%",
    minHeight: 46,
    height: 46,
    borderRadius: 24,
    borderWidth: 0,
    backgroundColor: "#eff2f5",
    paddingHorizontal: 16,
    paddingVertical: 0,
  },
  searchInput: {
    fontFamily: fontFamilies.regular,
    fontSize: 15,
    color: colors.patient.text,
    paddingVertical: 0,
  },
  clearInputButton: {
    padding: 4,
  },
  scrollBody: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  recentsSection: {
    marginTop: 6,
  },
  recentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  recentsHeaderText: {
    fontFamily: fontFamilies.medium,
    fontSize: 13.5,
    fontWeight: "500",
    color: "#6b7280",
  },
  clearAllText: {
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
    fontWeight: "700",
    color: colors.patient.primaryDark,
    letterSpacing: 0.5,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f2f4",
  },
  rowPressed: {
    backgroundColor: "#f9fafb",
  },
  rowIcon: {
    marginRight: 14,
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
  removeRecentButton: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e5e7eb",
    marginLeft: 20,
    marginRight: 20,
  },
  suggestionsSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  suggestionsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  suggestionsHeaderText: {
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
    fontWeight: "600",
    color: colors.patient.text,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f5f8",
    borderWidth: 1,
    borderColor: "#e5e9ef",
  },
  chipPressed: {
    backgroundColor: "#e8edf3",
  },
  chipText: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    fontWeight: "500",
    color: colors.patient.text,
  },
  resultsContainer: {
    paddingTop: 4,
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
