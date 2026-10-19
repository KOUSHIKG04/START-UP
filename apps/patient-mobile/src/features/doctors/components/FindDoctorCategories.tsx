import type { FindDoctorCategoriesProps } from "../types/find-doctor-categories";
import { AppText as Text } from "@startup/mobile-ui";
import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { Button } from "@startup/mobile-ui";
import { categories } from "../utils/findDoctorConstants";

export function FindDoctorCategories({
  onSelectCategory,
}: FindDoctorCategoriesProps) {
  const [showAllCategories, setShowAllCategories] = useState(false);
  const visibleCategories = showAllCategories
    ? categories
    : categories.slice(0, 9);

  return (
    <>
      <View>
        <Text variant="sectionHeading" style={styles.sectionTitle}>
          Browse by categories
        </Text>
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
                alt=""
                source={category.image}
                style={[
                  styles.categoryImage,
                  category.imageScale
                    ? { transform: [{ scale: category.imageScale }] }
                    : undefined,
                ]}
                resizeMode="contain"
              />
              <Text
                variant="label"
                numberOfLines={2}
                style={styles.categoryLabel}
              >
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
  sectionTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    color: colors.patient.text,
    marginBottom: 16,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    columnGap: 12,
    rowGap: 18,
  },
  categoryItem: {
    width: "30%",
    minHeight: 106,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  categoryItemPressed: {
    opacity: 0.7,
  },
  categoryImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginBottom: 6,
  },
  categoryLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.patient.text,
    textAlign: "center",
  },
  showAllButton: {
    marginTop: 12,
    borderColor: "#E5E7EB",
  },
});
