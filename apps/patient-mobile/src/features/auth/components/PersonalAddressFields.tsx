import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Controller, type Control } from "react-hook-form";
import { Navigation } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { AddressSheet } from "./AddressSheet";
import { emptyAddress } from "./addressTypes";
import type { ProfileFormValues } from "./ProfileForm";
import { PROFILE_PLACEHOLDER_COLOR, profileFormStyles } from "./profileFormStyles";
import { patientAddressSchema, patientProfileInputSchema } from "@startup/contracts";
import { Input } from "@startup/mobile-ui";

export function PersonalAddressFields({
  control,
  onClearError,
  field = "address",
}: {
  control: Control<ProfileFormValues>;
  onClearError: () => void;
  field?: "email" | "address";
}) {
  const [addressOpen, setAddressOpen] = useState(false);

  return (
    <>
      {field === "email" ? <>
      <Controller
        control={control}
        name="email"
        rules={{
          required: "Enter your email address.",
          validate: value => patientProfileInputSchema.shape.email.safeParse(value.trim()).success || "Enter a valid email address.",
        }}
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <Input
            label="Email"
            invalid={fieldState.invalid}
            labelStyle={profileFormStyles.label}
            containerStyle={styles.sectionLabel}
            accessibilityLabel="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="your@email.com"
            placeholderTextColor={PROFILE_PLACEHOLDER_COLOR}
            value={value}
            onChangeText={(text) => {
              onClearError();
              onChange(text);
            }}
            onBlur={onBlur}
            style={[profileFormStyles.control, profileFormStyles.text]}
          />
        )}
      />
      </> : <>
      <Text style={[styles.label, styles.sectionLabel]}>
        Add Address
      </Text>
      <Controller
        control={control}
        name="address"
        rules={{ validate: (value) => patientAddressSchema.safeParse(value).success || "Add and confirm your complete address." }}
        render={({ field: { onChange, value }, fieldState }) => (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={value ? "Edit address" : "Add address"}
              onPress={() => setAddressOpen(true)}
              style={[profileFormStyles.control, profileFormStyles.iconControl, fieldState.invalid && { borderColor: colors.danger }]}
            >
              {/* <Navigation size={22} color={colors.patient.primaryDark} /> */}
              <Text
                style={[
                  profileFormStyles.text,
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
                  : "Enter address"}
              </Text>
            </Pressable>
            <AddressSheet
              visible={addressOpen}
              value={value ?? emptyAddress}
              onClose={() => setAddressOpen(false)}
              onReopen={() => setAddressOpen(true)}
              onConfirm={(addr) => {
                onClearError();
                onChange(addr);
                setAddressOpen(false);
              }}
            />
          </>
        )}
      />
      </>}
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
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    color: PROFILE_PLACEHOLDER_COLOR,
  },
  selectTextFilled: {
    color: colors.patient.text,
  },
});
