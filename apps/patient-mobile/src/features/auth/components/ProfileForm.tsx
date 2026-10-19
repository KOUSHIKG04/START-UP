import { ProfileHeader } from "./ProfileHeader";
import { styles } from "./ProfileFormLayout.styles";
import { useProfileForm } from "../hooks/useProfileForm";
import type { ProfileFormProps } from "../types/profile-form";

import { bloodGroups, genders } from "../utils/profileFormConstants";
import { AppText as Text } from "@startup/mobile-ui";
import { Button } from "@startup/mobile-ui";

import { View } from "react-native";
import { router } from "expo-router";
import { LockKeyhole } from "lucide-react-native";
import {
  ageFromBirthDate,
  parseDisplayDate,
  contactPhoneForInput,
  normalizeContactPhone,
} from "@startup/contracts";
import { Controller } from "react-hook-form";
import { colors } from "@startup/design-tokens";
import { SelectDropdown } from "./SelectDropdown";

import type { ProfileDetails, ProfileFormValues } from "../types/profile";

import { onboardingButtonStyles, OnboardingShell } from "./OnboardingShell";
import { Input } from "@startup/mobile-ui";
import { BloodGroupSelector } from "./BloodGroupSelector";
import { FamilyRelationFields } from "./FamilyRelationFields";
import { PersonalAddressFields } from "./PersonalAddressFields";

import {
  PROFILE_PLACEHOLDER_COLOR,
  profileFormStyles,
} from "./ProfileFields.styles";

export type { ProfileDetails, ProfileFormValues } from "../types/profile";

export function ProfileForm({
  family = false,
  initialEmail = "",
  initialPhone = "",
  initialProfile,
  onSave,
}: ProfileFormProps) {
  const {
    setSubmitError,
    photoUrl,
    pickPhoto,
    control,
    handleSubmit,
    errors,
    isSubmitting,
    onSubmit,
  } = useProfileForm({
    family,
    initialEmail,
    initialPhone,
    initialProfile,
    onSave,
  });
  return (
    <OnboardingShell
      scroll
      showArt
      bottomArt={false}
      keepArtFixed
      centerContent
      onBack={() => {
        if (router.canGoBack()) router.back();
        else
          router.replace(
            initialProfile || family ? "/(app)/(tabs)/profile" : "/login"
          );
      }}
    >
      <View style={styles.body}>
        <ProfileHeader
          family={family}
          photoUrl={photoUrl}
          onPickPhoto={() => void pickPhoto()}
        />

        <Controller
          control={control}
          name="fullName"
          rules={{
            required: "Enter a name, valid date of birth, and blood group.",
            validate: (val) =>
              val.trim().length >= 2 ||
              "Enter a name, valid date of birth, and blood group.",
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Full Name"
              invalid={Boolean(errors.fullName)}
              labelStyle={profileFormStyles.label}
              accessibilityLabel="Full name"
              autoComplete="name"
              placeholder="Enter your full name"
              placeholderTextColor={PROFILE_PLACEHOLDER_COLOR}
              value={value}
              onChangeText={(text) => {
                setSubmitError("");
                onChange(text);
              }}
              onBlur={onBlur}
              style={[profileFormStyles.control, profileFormStyles.text]}
            />
          )}
        />

        {!family ? (
          <PersonalAddressFields
            field="email"
            control={control}
            onClearError={() => setSubmitError("")}
          />
        ) : null}

        {!family ? (
          <Controller
            control={control}
            name="phone"
            rules={{
              required: "Enter your phone number.",
              validate: (value) =>
                Boolean(normalizeContactPhone(value)) ||
                "Enter a valid mobile number, including the country code for international numbers.",
            }}
            render={({ field, fieldState }) => (
              <Input
                label="Phone Number"
                labelStyle={profileFormStyles.label}
                containerStyle={styles.sectionLabel}
                invalid={fieldState.invalid}
                keyboardType="phone-pad"
                autoComplete="tel"
                placeholder="Mobile number"
                prefix={
                  field.value.startsWith("+") && !field.value.startsWith("+91")
                    ? undefined
                    : "+91"
                }
                placeholderTextColor={PROFILE_PLACEHOLDER_COLOR}
                value={field.value}
                onChangeText={(value) =>
                  field.onChange(contactPhoneForInput(value))
                }
                onBlur={field.onBlur}
                style={[profileFormStyles.control, profileFormStyles.text]}
              />
            )}
          />
        ) : null}
        <View style={styles.twoColumns}>
          <View style={styles.ageColumn}>
            <Controller
              control={control}
              name="dateOfBirth"
              rules={{
                required: "Enter your date of birth in DD-MM-YYYY format.",
                validate: (val) => {
                  const birthDate = parseDisplayDate(val);
                  return (
                    (birthDate !== null &&
                      ageFromBirthDate(birthDate) !== null) ||
                    "Enter a valid date of birth in DD-MM-YYYY format."
                  );
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Date of Birth"
                  invalid={Boolean(errors.dateOfBirth)}
                  labelStyle={profileFormStyles.label}
                  accessibilityLabel="Date of birth"
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                  placeholder="DD-MM-YYYY"
                  placeholderTextColor={PROFILE_PLACEHOLDER_COLOR}
                  value={value}
                  onChangeText={(text) => {
                    setSubmitError("");
                    onChange(text);
                  }}
                  onBlur={onBlur}
                  style={[profileFormStyles.text, profileFormStyles.control]}
                />
              )}
            />
          </View>

          <View style={styles.genderColumn}>
            <Text variant="label" style={styles.label}>
              Gender
            </Text>
            <Controller
              control={control}
              name="gender"
              render={({ field: { onChange, value } }) => (
                <SelectDropdown
                  label="Gender"
                  value={
                    value === "Other" || value === "Prefer not to say"
                      ? "Other / Prefer not to say"
                      : value
                  }
                  options={genders as unknown as string[]}
                  onChange={(selected) =>
                    onChange(
                      selected === "Other / Prefer not to say"
                        ? "Other"
                        : selected
                    )
                  }
                />
              )}
            />
          </View>
        </View>

        <Text variant="label" style={[styles.label, styles.sectionLabel]}>
          Blood Group
        </Text>
        <Controller
          control={control}
          name="bloodGroup"
          rules={{
            required: "Enter a name, valid date of birth, and blood group.",
            validate: (val) =>
              Boolean(val) ||
              "Enter a name, valid date of birth, and blood group.",
          }}
          render={({ field: { onChange, value } }) => (
            <BloodGroupSelector
              bloodGroups={bloodGroups}
              invalid={Boolean(errors.bloodGroup)}
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

        <View
          style={[styles.save, family && { flexDirection: "row", gap: 12 }]}
        >
          {family ? (
            <View style={{ flex: 1 }}>
              <Button
                theme="patient"
                style={[
                  onboardingButtonStyles.button,
                  onboardingButtonStyles.outline,
                ]}
                labelStyle={onboardingButtonStyles.outlineLabel}

                label="Skip for now"
                variant="outline"
                disabled={isSubmitting}
                onPress={() => router.back()}
              />
            </View>
          ) : null}
          <View style={family ? { flex: 1 } : undefined}>
            <Button
              loading={isSubmitting}
              theme="patient"
              style={onboardingButtonStyles.button}
              labelStyle={onboardingButtonStyles.label}

              label={isSubmitting ? "Saving…" : "Save Profile"}
              disabled={isSubmitting}
              onPress={handleSubmit(onSubmit)}
            />
          </View>
        </View>
        <View style={styles.privacyRow}>
          <LockKeyhole size={16} color={colors.textSecondary} />
          <Text variant="body" style={styles.privacy}>
            Your Information is secure and private
          </Text>
        </View>
      </View>
    </OnboardingShell>
  );
}
