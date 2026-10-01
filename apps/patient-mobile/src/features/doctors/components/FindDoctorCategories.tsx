import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { Button, Chip } from "@startup/mobile-ui";
import { categories, symptoms } from "../utils/findDoctorConstants";

export function FindDoctorCategories({
  selectedSymptom,
  onSelectSymptom,
  onSelectCategory,
}: {
  selectedSymptom?: string;
  onSelectSymptom: (symptom: string) => void;
  onSelectCategory: (categoryKey: string, categoryLabel: string) => void;
}) {
  const [showAllCategories, setShowAllCategories] = useState(false);
  const visibleCategories = showAllCategories
    ? categories
    : categories.slice(0, 8);

  return (
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
                onPress={() => onSelectSymptom(symptom)}
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
              onPress={() =>
                onSelectCategory(
                  category.key,
                  category.label.replace("\n", " ")
                )
              }
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
            showAllCategories ? "Show less categories" : "Show all categories"
          }
          onPress={() => setShowAllCategories((prev) => !prev)}
          style={styles.showAllButton}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  symptomsTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    color: colors.patient.text,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    color: colors.patient.text,
    marginBottom: 16,
  },
  chipList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#F3F4F6",
    borderColor: "transparent",
  },
  selectedChip: {
    backgroundColor: "#E6F4F5",
    borderColor: colors.patient.primary,
  },
  chipLabel: {
    color: colors.patient.text,
    fontSize: 13,
  },
  selectedChipLabel: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  categoryItem: {
    width: "22%",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryItemPressed: {
    opacity: 0.7,
  },
  categoryImage: {
    width: 52,
    height: 52,
    borderRadius: 16,
    marginBottom: 6,
  },
  categoryLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    color: colors.patient.text,
    textAlign: "center",
  },
  showAllButton: {
    marginTop: 12,
    borderColor: "#E5E7EB",
  },
});
