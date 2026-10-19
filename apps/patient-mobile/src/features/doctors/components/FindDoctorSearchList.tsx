import type { FindDoctorSearchListProps } from "../types/find-doctor-search-list";
import type { CategoryItem } from "../types/find-doctor-search-list";
export type { CategoryItem } from "../types/find-doctor-search-list";
import { AppText as Text, Chip } from "@startup/mobile-ui";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { Clock3, Search } from "lucide-react-native";
import { symptoms } from "../utils/findDoctorConstants";

export function FindDoctorSearchList({
  filteredCategories,
  doctorMatches,
  searchQuery,
  recentSearches,
  onSelectSymptom,
  onSelectRecent,
  onClearRecentSearches,
  onSelectCategory,
  onSelectDoctor,
  onSearchAnyway,
}: FindDoctorSearchListProps) {
  return (
    <View style={styles.searchActiveList}>
      {!searchQuery.trim() ? (
        <>
          <Text variant="sectionHeading" style={styles.sectionTitle}>
            Most searched symptoms
          </Text>
          <View style={styles.chipList}>
            {symptoms.map((symptom) => (
              <Chip
                key={symptom}
                label={symptom}
                onPress={() => onSelectSymptom(symptom)}
                style={styles.chip}
                labelStyle={styles.chipLabel}
              />
            ))}
          </View>
          <View style={styles.recentsHeader}>
            <Text variant="sectionHeading" style={styles.sectionTitle}>
              Recent searches
            </Text>
            {recentSearches.length > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear recent searches"
                onPress={onClearRecentSearches}
                style={styles.clearButton}
              >
                <Text variant="label" style={styles.clearText}>
                  Clear
                </Text>
              </Pressable>
            )}
          </View>
          {recentSearches.length > 0 ? (
            recentSearches.map((term) => (
              <Pressable
                key={term}
                accessibilityRole="button"
                accessibilityLabel={`Search again for ${term}`}
                onPress={() => onSelectRecent(term)}
                style={({ pressed }) => [
                  styles.categoryRow,
                  pressed && styles.categoryRowPressed,
                ]}
              >
                <View style={styles.doctorIcon}>
                  <Clock3 color={colors.patient.primaryDark} size={21} />
                </View>
                <Text variant="body" style={styles.categoryRowTitle}>
                  {term}
                </Text>
              </Pressable>
            ))
          ) : (
            <Text variant="body" style={styles.emptyRecentText}>
              Your searches will appear here.
            </Text>
          )}
        </>
      ) : doctorMatches.length > 0 || filteredCategories.length > 0 ? (
        <>
          {doctorMatches.map((doctor) => (
            <Pressable
              key={doctor.id}
              accessibilityRole="button"
              accessibilityLabel={`${doctor.name}, Doctor`}
              onPress={() => onSelectDoctor(doctor.name)}
              style={({ pressed }) => [
                styles.categoryRow,
                pressed && styles.categoryRowPressed,
              ]}
            >
              <View style={styles.doctorIcon}>
                <Search color={colors.patient.primaryDark} size={22} />
              </View>
              <View style={styles.categoryRowContent}>
                <Text variant="cardHeading" style={styles.categoryRowTitle}>
                  {doctor.name}
                </Text>
                <Text variant="cardHeading" style={styles.categoryRowSubtitle}>
                  Doctor
                </Text>
              </View>
            </Pressable>
          ))}
          {filteredCategories.map((category) => (
            <Pressable
              key={category.key}
              accessibilityRole="button"
              accessibilityLabel={category.label.replace("\n", " ")}
              onPress={() =>
                onSelectCategory(
                  category.key,
                  category.label.replace("\n", " ")
                )
              }
              style={({ pressed }) => [
                styles.categoryRow,
                pressed && styles.categoryRowPressed,
              ]}
            >
              <Image
                alt=""
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
                <Text variant="cardHeading" style={styles.categoryRowTitle}>
                  {category.label.replace("\n", " ")}
                </Text>
                <Text variant="cardHeading" style={styles.categoryRowSubtitle}>
                  Speciality
                </Text>
              </View>
            </Pressable>
          ))}
        </>
      ) : (
        <View style={styles.emptyResults}>
          <Text variant="body" style={styles.emptyText}>
            No categories found for &quot;{searchQuery}&quot;.
          </Text>
          <Pressable
            onPress={() => onSearchAnyway(searchQuery.trim())}
            style={styles.searchAnywayButton}
          >
            <Text variant="body" style={styles.searchAnywayText}>
              Search for &quot;{searchQuery}&quot;
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchActiveList: {
    paddingTop: 4,
  },
  sectionTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    marginBottom: 12,
  },
  chipList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 28,
  },
  chip: {
    backgroundColor: colors.patient.surface,
    borderColor: "transparent",
  },
  chipLabel: {
    color: colors.patient.text,
    fontSize: 13,
  },
  recentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  clearButton: {
    minHeight: 44,
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  clearText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
  },
  emptyRecentText: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  categoryRowPressed: {
    backgroundColor: "#F9FAFB",
  },
  categoryRowImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginRight: 14,
  },
  doctorIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginRight: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryRowContent: {
    flex: 1,
  },
  categoryRowTitle: {
    fontSize: 15,
    fontFamily: fontFamilies.medium,
    color: colors.patient.text,
  },
  categoryRowSubtitle: {
    fontSize: 12,
    fontFamily: fontFamilies.regular,
    color: colors.patient.textSecondary,
    marginTop: 2,
  },
  emptyResults: {
    alignItems: "center",
    paddingVertical: 36,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    color: colors.patient.textSecondary,
    textAlign: "center",
  },
  searchAnywayButton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchAnywayText: {
    fontSize: 14,
    fontFamily: fontFamilies.medium,
    color: colors.patient.primaryDark,
  },
});
