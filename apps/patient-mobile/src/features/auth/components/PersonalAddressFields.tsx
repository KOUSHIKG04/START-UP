import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { Controller, type Control } from "react-hook-form";
import { ChevronDown } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { AddressSheet } from "./AddressSheet";
import { emptyAddress } from "./addressTypes";
import type { ProfileFormValues } from "./ProfileForm";

export function PersonalAddressFields({
  control,
  onClearError,
}: {
  control: Control<ProfileFormValues>;
  onClearError: () => void;
}) {
  const [addressOpen, setAddressOpen] = useState(false);

  return (
    <>
      <Text style={[styles.label, styles.sectionLabel]}>
        Email (optional)
      </Text>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            accessibilityLabel="Optional email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="your@email.com"
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

      <Text style={[styles.label, styles.sectionLabel]}>
        Add Address (optional)
      </Text>
      <Controller
        control={control}
        name="address"
        render={({ field: { onChange, value } }) => (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={value ? "Edit address" : "Add address"}
              onPress={() => setAddressOpen(true)}
              style={styles.select}
            >
              <Text
                style={[
                  styles.placeholder,
                  Boolean(value?.building && value?.line1) &&
                    styles.selectTextFilled,
                ]}
                numberOfLines={1}
              >
                {value?.building && value?.line1
                  ? [value.building, value.line1, value.city]
                      .filter(Boolean)
                      .join(", ")
                  : "enter address"}
              </Text>
              <ChevronDown size={18} color={colors.patient.primaryDark} />
            </Pressable>
            <AddressSheet
              visible={addressOpen}
              value={value ?? emptyAddress}
              onClose={() => setAddressOpen(false)}
              onConfirm={(addr) => {
                onChange(addr);
                setAddressOpen(false);
              }}
            />
          </>
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
  select: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FAFAFA",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  placeholder: {
    fontSize: 15,
    fontFamily: fontFamilies.regular,
    color: "#9CA3AF",
  },
  selectTextFilled: {
    color: colors.patient.text,
  },
});
