import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { colors, fontFamilies } from "@startup/design-tokens";
import { SelectDropdown } from "./SelectDropdown";
import { AddressSheet, type PatientAddress } from "./AddressSheet";
import { emptyAddress } from "./addressTypes";
import { OnboardingButton, OnboardingShell } from "./OnboardingShell";
import { useToastFeedback } from "@startup/mobile-ui";

import { BloodGroupSelector } from "./BloodGroupSelector";
import { FamilyRelationFields } from "./FamilyRelationFields";
import { PersonalAddressFields } from "./PersonalAddressFields";

const city = require("../../../../assets/images/onboarding/city.png");

const bloodGroups = ["A+", "A−", "B+", "B−", "O+", "O−", "AB+", "AB−"] as const;
const genders = ["Male", "Female", "Other", "Prefer not to say"] as const;
const relations = [
  "Son",
  "Daughter",
  "Father",
  "Mother",
  "Spouse",
  "Sibling",
  "Other",
] as const;

export type ProfileDetails = {
  fullName: string;
  age: number;
  gender: string;
  bloodGroup: string;
  email?: string;
  address?: PatientAddress;
  relation?: string;
  phone?: string;
  notify?: boolean;
};

export type ProfileFormValues = {
  fullName: string;
  age: string;
  gender: string;
  bloodGroup: string;
  email: string;
  address?: PatientAddress;
  relation: string;
  phone: string;
  notify: boolean;
};

function getInitialFormValues(
  initialProfile?: {
    full_name: string;
    age_years: number | null;
    gender: string | null;
    blood_group: string | null;
    email: string | null;
    address: PatientAddress | null;
  },
  family = false,
  initialEmail = ""
): ProfileFormValues {
  const ageStr =
    initialProfile?.age_years !== null && initialProfile?.age_years !== undefined
      ? String(initialProfile.age_years)
      : "";
  return {
    fullName: initialProfile?.full_name ?? "",
    age: ageStr,
    gender: initialProfile?.gender ?? "Male",
    bloodGroup: (initialProfile?.blood_group ?? "").replace("-", "−"),
    email: initialProfile?.email ?? (!family ? initialEmail : ""),
    address: initialProfile?.address ?? undefined,
    relation: "Son",
    phone: "",
    notify: false,
  };
}

function formatProfilePayload(values: ProfileFormValues, family: boolean): ProfileDetails {
  const years = Number(values.age);
  return {
    fullName: values.fullName.trim(),
    age: years,
    gender: values.gender,
    bloodGroup: values.bloodGroup.replace("−", "-"),
    email: values.email?.trim() || undefined,
    address: values.address,
    relation: family ? values.relation : undefined,
    phone: family ? `+91${values.phone.replace(/\D/g, "")}` : undefined,
    notify: family ? values.notify : undefined,
  };
}

function ProfileHeader({ family }: { family: boolean }) {
  return (
    <View style={styles.head}>
      <View style={styles.avatar}>
        <View style={styles.avatarHead} />
        <View style={styles.avatarBody} />
      </View>
      <View style={styles.headText}>
        <Text style={styles.title}>
          {family ? "Family member Profile" : "Your Profile"}
        </Text>
      </View>
    </View>
  );
}

export function ProfileForm({
  family = false,
  initialEmail = "",
  initialProfile,
  onSave,
}: {
  family?: boolean;
  initialEmail?: string;
  initialProfile?: {
    full_name: string;
    age_years: number | null;
    gender: string | null;
    blood_group: string | null;
    email: string | null;
    address: PatientAddress | null;
  };
  onSave: (details: ProfileDetails) => Promise<void>;
}) {
  const [submitError, setSubmitError] = useState("");

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    defaultValues: getInitialFormValues(initialProfile, family, initialEmail),
  });

  useEffect(() => {
    if (initialProfile) {
      reset(getInitialFormValues(initialProfile, family, initialEmail));
    } else if (!family && initialEmail) {
      setValue("email", initialEmail);
    }
  }, [initialProfile, initialEmail, family, reset, setValue]);

  const onSubmit = async (values: ProfileFormValues) => {
    setSubmitError("");
    try {
      await onSave(formatProfilePayload(values, family));
    } catch (cause) {
      setSubmitError(
        cause instanceof Error ? cause.message : "Could not save the profile."
      );
    }
  };

  const displayError =
    submitError ||
    errors.fullName?.message ||
    errors.age?.message ||
    errors.bloodGroup?.message ||
    errors.phone?.message;
  useToastFeedback({ error: displayError });

  return (
    <OnboardingShell onBack={() => router.back()} bottomArt={false} scroll>
      <View style={styles.body}>
        <ProfileHeader family={family} />

        <Text style={styles.label}>Full Name</Text>
        <Controller
          control={control}
          name="fullName"
          rules={{
            required: "Enter a name, valid age, and blood group.",
            validate: (val) =>
              val.trim().length >= 2 || "Enter a name, valid age, and blood group.",
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              accessibilityLabel="Full name"
              autoComplete="name"
              placeholder="Enter your full name"
              value={value}
              onChangeText={(text) => {
                setSubmitError("");
                onChange(text);
              }}
              onBlur={onBlur}
              style={styles.input}
            />
          )}
        />

        <View style={styles.twoColumns}>
          <View style={styles.ageColumn}>
            <Text style={styles.label}>Age</Text>
            <Controller
              control={control}
              name="age"
              rules={{
                required: "Enter a name, valid age, and blood group.",
                validate: (val) => {
                  const years = Number(val);
                  return (
                    (val.trim() !== "" &&
                      Number.isInteger(years) &&
                      years >= 0 &&
                      years <= 120) ||
                    "Enter a name, valid age, and blood group."
                  );
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  accessibilityLabel="Age"
                  keyboardType="number-pad"
                  maxLength={3}
                  placeholder="Age"
                  value={value}
                  onChangeText={(text) => {
                    setSubmitError("");
                    onChange(text);
                  }}
                  onBlur={onBlur}
                  style={styles.input}
                />
              )}
            />
          </View>

          <View style={styles.genderColumn}>
            <Text style={styles.label}>Gender</Text>
            <Controller
              control={control}
              name="gender"
              render={({ field: { onChange, value } }) => (
                <SelectDropdown
                  label="Gender"
                  value={value}
                  options={genders as unknown as string[]}
                  onChange={onChange}
                />
              )}
            />
          </View>
        </View>

        <Text style={[styles.label, styles.sectionLabel]}>Blood Group</Text>
        <Controller
          control={control}
          name="bloodGroup"
          rules={{
            required: "Enter a name, valid age, and blood group.",
            validate: (val) =>
              Boolean(val) || "Enter a name, valid age, and blood group.",
          }}
          render={({ field: { onChange, value } }) => (
            <BloodGroupSelector
              bloodGroups={bloodGroups}
              value={value}
              onChange={(item) => {
                setSubmitError("");
                onChange(item);
              }}
            />
          )}
        />

        {family ? (
          <FamilyRelationFields
            control={control}
            onClearError={() => setSubmitError("")}
          />
        ) : (
          <PersonalAddressFields
            control={control}
            onClearError={() => setSubmitError("")}
          />
        )}


        <View style={styles.save}>
          <OnboardingButton
            label={isSubmitting ? "Saving…" : "Save Profile"}
            disabled={isSubmitting}
            onPress={handleSubmit(onSubmit)}
          />
        </View>

        {family ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/(app)/(tabs)")}
            style={styles.skip}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        ) : null}

        <Text style={styles.privacy}>
          ♢ Your Information is secure and private
        </Text>

        {!family ? (
          <Image source={city} resizeMode="stretch" style={styles.bottomArt} />
        ) : null}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingTop: 8,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 29,
  },
  headText: { flex: 1 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.patient.primaryDark,
    alignItems: "center",
    overflow: "hidden",
  },
  avatarHead: {
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: colors.white,
    marginTop: 12,
  },
  avatarBody: {
    width: 55,
    height: 30,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.white,
    marginTop: 6,
  },
  title: {
    fontFamily: fontFamilies.regular,
    fontSize: 22,
    color: colors.black,
  },
  label: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    color: colors.black,
    marginLeft: 6,
    marginBottom: 8,
  },
  sectionLabel: { marginTop: 20 },
  input: {
    width: "100%",
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D1D1",
    paddingHorizontal: 18,
    fontFamily: fontFamilies.regular,
    fontSize: 17,
    backgroundColor: colors.white,
  },
  twoColumns: { flexDirection: "row", gap: 18, marginTop: 19 },
  ageColumn: { flex: 0.8 },
  genderColumn: { flex: 1.2 },
  select: {
    width: "100%",
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D1D1",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
  },
  selectText: { fontFamily: fontFamilies.regular, fontSize: 17, color: "#777" },
  placeholder: {
    fontFamily: fontFamilies.regular,
    fontSize: 17,
    color: "#777",
    flexShrink: 1,
  },
  selectTextFilled: {
    color: colors.textPrimary,
  },
  options: {
    borderWidth: 1,
    borderColor: "#D1D1D1",
    borderRadius: 10,
    marginTop: 4,
    backgroundColor: colors.white,
  },
  option: { paddingHorizontal: 16, paddingVertical: 11 },
  bloodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  blood: {
    width: "22%",
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D1D1",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedBlood: {
    backgroundColor: colors.patient.primaryDark,
    borderColor: colors.patient.primaryDark,
  },
  bloodText: { fontFamily: fontFamilies.regular, fontSize: 14 },
  selectedBloodText: { color: colors.white },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 26,
  },
  checkbox: { width: 20, height: 20, backgroundColor: "#D5D7D9" },
  checked: { backgroundColor: colors.patient.primaryDark },
  checkboxText: {
    color: "#777",
    fontFamily: fontFamilies.regular,
    fontSize: 14,
  },
  save: { marginTop: 18 },
  privacy: {
    textAlign: "center",
    marginTop: 18,
    color: "#777",
    fontFamily: fontFamilies.regular,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    fontFamily: fontFamilies.regular,
    marginTop: 12,
  },
  skip: { marginTop: 14, alignItems: "center", padding: 8 },
  skipText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.medium,
    fontSize: 15,
  },
  bottomArt: { width: "115%", height: 175, alignSelf: "center", marginTop: 2 },
});
