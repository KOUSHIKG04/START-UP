import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Controller, type Control } from "react-hook-form";
import { colors, fontFamilies } from "@startup/design-tokens";
import { SelectDropdown } from "./SelectDropdown";
import type { ProfileFormValues } from "./ProfileForm";
import { PROFILE_PLACEHOLDER_COLOR, profileFormStyles } from "./profileFormStyles";
import { Checkbox, Input } from "@startup/mobile-ui";

const relations = [
  "Son",
  "Daughter",
  "Spouse",
  "Father",
  "Mother",
  "Sibling",
  "Other",
];

export function FamilyRelationFields({
  control,
  onClearError,
}: {
  control: Control<ProfileFormValues>;
  onClearError: () => void;
}) {
  return (
    <>
      <Text style={[styles.label, styles.sectionLabel]}>Relation</Text>
      <Controller
        control={control}
        name="relation"
        render={({ field: { onChange, value } }) => (
          <SelectDropdown
            label="Relation"
            value={value}
            options={relations}
            onChange={onChange}
          />
        )}
      />

      <Controller
        control={control}
        name="phone"
        rules={{
          validate: (val) => {
            return (
              val.replace(/\D/g, "").length === 10 ||
              "Enter a 10-digit phone number for your family contact."
            );
          },
        }}
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <Input
            label="Phone Number"
            invalid={fieldState.invalid}
            labelStyle={profileFormStyles.label}
            containerStyle={styles.sectionLabel}
            accessibilityLabel="Family member phone number"
            keyboardType="phone-pad"
            placeholder="+91"
            maxLength={10}
            value={value}
            onChangeText={(text) => {
              onClearError();
              onChange(text);
            }}
            onBlur={onBlur}
            placeholderTextColor={PROFILE_PLACEHOLDER_COLOR}
            style={[profileFormStyles.control, profileFormStyles.text]}
          />
        )}
      />

      <Controller
        control={control}
        name="notify"
        render={({ field: { onChange, value } }) => (
          <Checkbox theme="patient" checked={value} onCheckedChange={onChange}
            label="Notify this contact with emergency updates" labelStyle={{ fontSize: 15, lineHeight: 21 }} style={{ marginTop: 14 }} />
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontFamily: fontFamilies.medium,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  sectionLabel: {
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fontFamilies.regular,
    color: colors.patient.text,
    backgroundColor: "#FAFAFA",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.patient.primary,
  },
  checked: {
    backgroundColor: colors.patient.primary,
  },
  checkboxText: {
    fontSize: 13,
    fontFamily: fontFamilies.regular,
    color: colors.patient.textSecondary,
    flex: 1,
  },
});
