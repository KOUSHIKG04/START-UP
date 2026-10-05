import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { Search } from "lucide-react-native";

interface CategoryItem {
  key: string;
  label: string;
  image: ImageSourcePropType;
  imageScale?: number;
}

export function FindDoctorSearchList({
  filteredCategories,
  doctorMatches,
  searchQuery,
  onSelectCategory,
  onSelectDoctor,
  onSearchAnyway,
}: {
  filteredCategories: readonly CategoryItem[];
  doctorMatches: readonly { id: string; name: string }[];
  searchQuery: string;
  onSelectCategory: (categoryKey: string, categoryLabel: string) => void;
  onSelectDoctor: (doctorName: string) => void;
  onSearchAnyway: (query: string) => void;
}) {
  return (
    <View style={styles.searchActiveList}>
      {doctorMatches.length > 0 || filteredCategories.length > 0 ? (
        <>
          {doctorMatches.map((doctor) => (
            <Pressable
              key={doctor.id}
              accessibilityRole="button"
              accessibilityLabel={`${doctor.name}, Doctor`}
              onPress={() => onSelectDoctor(doctor.name)}
              style={({ pressed }) => [styles.categoryRow, pressed && styles.categoryRowPressed]}
            >
              <View style={styles.doctorIcon}>
                <Search color={colors.patient.primaryDark} size={22} />
              </View>
              <View style={styles.categoryRowContent}>
                <Text style={styles.categoryRowTitle}>{doctor.name}</Text>
                <Text style={styles.categoryRowSubtitle}>Doctor</Text>
              </View>
            </Pressable>
          ))}
          {filteredCategories.map((category) => (
          <Pressable
            key={category.key}
            accessibilityRole="button"
            accessibilityLabel={category.label.replace("\n", " ")}
            onPress={() =>
              onSelectCategory(category.key, category.label.replace("\n", " "))
            }
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
          ))}
        </>
      ) : (
        <View style={styles.emptyResults}>
          <Text style={styles.emptyText}>
            No categories found for &quot;{searchQuery}&quot;.
          </Text>
          <Pressable
            onPress={() => onSearchAnyway(searchQuery.trim())}
            style={styles.searchAnywayButton}
          >
            <Text style={styles.searchAnywayText}>
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
