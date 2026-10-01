import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Controller, type Control } from "react-hook-form";
import { colors, fontFamilies } from "@startup/design-tokens";
import { SelectDropdown } from "./SelectDropdown";
import type { ProfileFormValues } from "./ProfileForm";

const relations = [
  "Son",
  "Daughter",
  "Spouse",
  "Father",
  "Mother",
  "Brother",
  "Sister",
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

      <Text style={[styles.label, styles.sectionLabel]}>Phone Number</Text>
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
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
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
            style={styles.input}
          />
        )}
      />

      <Controller
        control={control}
        name="notify"
        render={({ field: { onChange, value } }) => (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: value }}
            onPress={() => onChange(!value)}
            style={styles.checkboxRow}
          >
            <View style={[styles.checkbox, value && styles.checked]} />
            <Text style={styles.checkboxText}>
              Notify this contact with emergency updates
            </Text>
          </Pressable>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontFamily: fontFamilies.medium,
    color: colors.patient.text,
    marginBottom: 6,
  },
  sectionLabel: {
    marginTop: 14,
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
