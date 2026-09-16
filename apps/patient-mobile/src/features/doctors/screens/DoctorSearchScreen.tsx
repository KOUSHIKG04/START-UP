import { DoctorSearchHeader } from "@/features/doctors/components/DoctorSearchHeader";
import { symptoms, categories } from "@/features/doctors/data/discovery";
import { useState } from "react";
import { router, type Href } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import {
  colors,
  fontFamilies,
  radius,
  shadows,
  spacing,
} from "@startup/design-tokens";
import { Chip, FadedScrollView, IconLabel } from "@startup/mobile-ui";
import type { ConsultationType } from "@/types/appointment";
import type { PatientScreenProps } from "@/types/screen";

function getDoctorResultsRoute(
  symptom: string,
  consultationType: ConsultationType
) {
  return {
    pathname: "/doctor/results",
    params: { symptom, consultationType },
  } satisfies Href;
}

type DoctorSearchScreenProps = PatientScreenProps & {
  consultationType: ConsultationType;
};

export function DoctorSearchScreen({
  consultationType,
  onBackPress,
}: DoctorSearchScreenProps) {
  const [selectedSymptom, setSelectedSymptom] = useState<string>();
  const [selectedCategory, setSelectedCategory] = useState("common");
  const [showSymptoms, setShowSymptoms] = useState(false);

  return (
    <View style={styles.screen}>
      <DoctorSearchHeader
        onBackPress={onBackPress}
        onSearchFocus={() => setShowSymptoms(true)}
      />

      <FadedScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {showSymptoms ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Common symptoms</Text>
            <View style={styles.chipList}>
              {symptoms.map((symptom) => {
                const selected = selectedSymptom === symptom;
                return (
                  <Chip
                    key={symptom}
                    label={symptom}
                    onPress={() => {
                      setSelectedSymptom(symptom);
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
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse by categories</Text>
          <View style={styles.categoryGrid}>
            {categories.map((category) => {
              const selected = selectedCategory === category.key;
              const CategoryIcon = category.icon;
              return (
                <IconLabel
                  key={category.key}
                  accessibilityState={{ selected }}
                  icon={({ color, size }) => (
                    <CategoryIcon color={color} size={size} strokeWidth={1.9} />
                  )}
                  label={category.label}
                  onPress={() => {
                    setSelectedCategory(category.key);
                    router.push(
                      getDoctorResultsRoute(
                        category.label.replace("\n", " "),
                        consultationType
                      )
                    );
                  }}
                  backgroundColor={
                    selected ? colors.patient.surface : colors.white
                  }
                  borderColor={
                    selected
                      ? colors.patient.primaryDark
                      : colors.patient.surfaceBorder
                  }
                  borderWidth={selected ? 1.5 : 1}
                  iconColor={colors.patient.primaryDark}
                  iconSize={24}
                  surfaceSize={66}
                  surfaceRadius={radius.md}
                  labelWidth={70}
                  gap={7}
                  labelNumberOfLines={2}
                  style={styles.category}
                  iconContainerStyle={styles.categorySurface}
                  labelStyle={styles.categoryLabel}
                />
              );
            })}
          </View>
        </View>
      </FadedScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.patient.background,
  },
  content: {
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: 126,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 23,
  },
  chipList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    minHeight: 32,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderWidth: 0,
    backgroundColor: colors.patient.surface,
  },
  selectedChip: {
    backgroundColor: colors.patient.primaryDark,
  },
  chipLabel: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    fontWeight: "500",
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
  category: {
    width: "23%",
  },
  categorySurface: {
    ...shadows.card,
  },
  categoryLabel: {
    color: colors.patient.text,
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 13,
  },
});
