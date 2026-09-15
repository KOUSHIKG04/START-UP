import { useState } from "react";
import { router, type Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Activity,
  Baby,
  Bean,
  Bone,
  Brain,
  Droplets,
  Ear,
  Eye,
  HeartPulse,
  ChevronLeft,
  Mars,
  Mic,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Venus,
  Wind,
  type LucideIcon,
} from "lucide-react-native";
import {
  colors,
  fontFamilies,
  gradients,
  radius,
  shadows,
  spacing,
} from "@startup/design-tokens";
import {
  Chip,
  FadedScrollView,
  IconLabel,
  SafeAreaView,
  SearchInput,
} from "@startup/mobile-ui";
import type { ConsultationType } from "../../types/appointment";
import type { PatientScreenProps } from "../types";

const symptoms = [
  "Chest pain",
  "Headache",
  "Fever",
  "Back pain",
  "Skin rash",
  "Stomach pain",
  "Anxiety",
  "Dizziness",
] as const;

function getDoctorResultsRoute(
  symptom: string,
  consultationType: ConsultationType
) {
  return {
    pathname: "/doctor-results",
    params: { symptom, consultationType },
  } as unknown as Href;
}

type DoctorCategory = {
  key: string;
  label: string;
  icon: LucideIcon;
};

const categories: DoctorCategory[] = [
  { key: "common", label: "Common\nIllness", icon: Stethoscope },
  { key: "vision", label: "Eyes &\nVision", icon: Eye },
  { key: "heart", label: "Heart", icon: HeartPulse },
  { key: "lungs", label: "Breathing &\nLungs", icon: Wind },
  { key: "digestion", label: "Stomach &\nDigestion", icon: Activity },
  { key: "bones", label: "Bones, Joints\n& Muscles", icon: Bone },
  { key: "brain", label: "Brain & Nervous\nSystem", icon: Brain },
  { key: "skin", label: "Skin & Hair", icon: Sparkles },
  { key: "women", label: "Women's\nHealth", icon: Venus },
  { key: "men", label: "Men's\nHealth", icon: Mars },
  { key: "mental", label: "Mental\nHealth", icon: Brain },
  { key: "ent", label: "Ear, Nose &\nThroat", icon: Ear },
  { key: "diabetes", label: "Diabetes &\nHormones", icon: Droplets },
  { key: "kidney", label: "Kidney &\nUrinary", icon: Bean },
  { key: "allergies", label: "Allergies &\nImmune", icon: ShieldCheck },
  { key: "children", label: "Children's\nHealth", icon: Baby },
];

type FindDoctorScreenProps = PatientScreenProps & {
  consultationType: ConsultationType;
};

type FindDoctorHeaderProps = {
  onBackPress: () => void;
  onSearchFocus: () => void;
};

function FindDoctorHeader({
  onBackPress,
  onSearchFocus,
}: FindDoctorHeaderProps) {
  return (
    <LinearGradient
      colors={gradients.patientBanner.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <SafeAreaView edges={["top"]}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onBackPress}
            style={({ pressed }) => [
              styles.backButton,
              pressed ? styles.backButtonPressed : undefined,
            ]}
          >
            <ChevronLeft color={colors.white} size={30} strokeWidth={2.5} />
          </Pressable>

          <SearchInput
            accessibilityLabel="Describe what you're feeling"
            containerStyle={styles.headerSearch}
            iconSize={18}
            inputStyle={styles.searchInput}
            onFocus={onSearchFocus}
            placeholder="Describe what you're feeling..."
            placeholderTextColor={colors.patient.muted}
            rightAccessory={
              <Mic
                color={colors.patient.primaryDark}
                size={19}
                strokeWidth={2}
              />
            }
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

export function FindDoctorScreen({
  consultationType,
  onBackPress,
}: FindDoctorScreenProps) {
  const [selectedSymptom, setSelectedSymptom] = useState<string>();
  const [selectedCategory, setSelectedCategory] = useState("common");
  const [showSymptoms, setShowSymptoms] = useState(false);

  return (
    <View style={styles.screen}>
      <FindDoctorHeader
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
                    <CategoryIcon
                      color={color}
                      size={size}
                      strokeWidth={1.9}
                    />
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
  headerRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    width: 32,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  headerSearch: {
    maxWidth: 420,
    height: 48,
    flex: 1,
    borderWidth: 0,
    borderRadius: 24,
    ...shadows.card,
  },
  searchInput: {
    color: colors.patient.text,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
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
