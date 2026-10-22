import { useDriverAddressSheet } from "../hooks/useDriverAddressSheet";
import type { AddressSheetProps } from "../types/address-sheet";
import { Button } from "@startup/mobile-ui";
import { ModalSurface } from "@startup/mobile-ui";
import { Input } from "@startup/mobile-ui";

import { router, type Href } from "expo-router";

import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { MapPin, X } from "lucide-react-native";
import { colors, fontFamilies, surfaces } from "@startup/design-tokens";
import { type PatientAddress } from "../types/address";

import {
  PROFILE_FIELD_HEIGHT,
  PROFILE_PLACEHOLDER_COLOR,
  profileFormStyles,
} from "./DriverAddress.styles";

import { patientAddressSchema } from "@startup/contracts";

export type { PatientAddress };

export function AddressSheet({
  visible,
  value,
  onClose,
  onConfirm,
  onReopen,
}: AddressSheetProps) {
  const {
    insets,
    profile,
    address,
    setAddress,
    setError,
    attemptedConfirm,
    awaitingMap,
    clearChosen,
    handleConfirm,
  } = useDriverAddressSheet({ visible, value, onClose, onConfirm, onReopen });
  function renderField(
    label: string,
    key: "building" | "line1" | "line2" | "city" | "state" | "pincode",
    placeholder: string,
    keyboardType: "default" | "number-pad" = "default",
    maxLength?: number
  ) {
    return (
      <Input
        label={label}
        invalid={
          attemptedConfirm &&
          !patientAddressSchema.shape[key].safeParse(address[key].trim())
            .success
        }
        labelStyle={styles.label}
        containerStyle={styles.field}
        accessibilityLabel={label}
        placeholder={placeholder}
        placeholderTextColor={PROFILE_PLACEHOLDER_COLOR}
        value={address[key]}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onChangeText={(text) => {
          setError("");
          setAddress((current) => ({ ...current, [key]: text }));
        }}
        style={[profileFormStyles.control, profileFormStyles.text]}
      />
    );
  }

  return (
    <ModalSurface
      layout="custom"
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Dismiss address drawer"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheetContainer}
        >
          <View style={styles.sheet}>
            {/* Handle Area */}
            <View style={styles.handleArea}>
              <View style={styles.handle} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Add Address</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close address sheet"
                hitSlop={8}
                onPress={onClose}
                style={styles.closeButton}
              >
                <X size={22} color="#8E9BAE" />
              </Pressable>
            </View>

            {/* Scrollable Content */}
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.scroll}
              contentContainerStyle={[
                styles.content,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              <View style={styles.fieldsContainer}>
                {renderField(
                  "House No. / Flat / Building",
                  "building",
                  "e.g. 42, Sunshine Apartments"
                )}
                {renderField("Address Line 1", "line1", "Street name, area")}
                {renderField(
                  "Address Line 2",
                  "line2",
                  "Landmark, nearby place (optional)"
                )}
                <View style={styles.row}>
                  {renderField("City", "city", "City name")}
                  {renderField("State", "state", "State name")}
                </View>
                {renderField(
                  "Pincode",
                  "pincode",
                  "e.g. 400001",
                  "number-pad",
                  6
                )}
              </View>

              <Button
                theme="driver"
                label="Choose location on map"
                variant="outline"
                leftIcon={<MapPin size={18} color={colors.driver.primary} />}
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                  clearChosen();
                  awaitingMap.current = true;
                  router.push({
                    pathname: profile?.driver?.id
                      ? "/profile-location"
                      : "/registration-location",
                    params: {
                      ...(address.latitude !== undefined &&
                      address.longitude !== undefined
                        ? {
                            latitude: String(address.latitude),
                            longitude: String(address.longitude),
                          }
                        : {}),
                    },
                  } as Href);
                }}
                style={[
                  styles.locationCard,
                  { height: PROFILE_FIELD_HEIGHT, paddingVertical: 0 },
                ]}
              />
              {/* Confirm Address Button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm Address"
                onPress={handleConfirm}
                style={styles.confirmButton}
              >
                <Text style={styles.confirmButtonText}>Confirm Address</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ModalSurface>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "#00000066",
  },
  sheetContainer: {
    width: "100%",
    maxHeight: "88%",
  },
  sheet: {
    flexShrink: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  handleArea: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: "center",
    width: "100%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontFamily: fontFamilies.semibold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 24,
    gap: 16,
  },
  scroll: { flexShrink: 1 },
  locationCard: {
    ...surfaces.card,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#E6F4F4",
    alignItems: "center",
    justifyContent: "center",
  },
  locationTextContainer: {
    flex: 1,
    gap: 2,
  },
  locationTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  locationSub: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: "#71818F",
    lineHeight: 16,
  },
  fieldsContainer: {
    gap: 16,
  },
  field: {
    flex: 1,
    width: undefined,
    gap: 8,
  },
  label: {
    fontFamily: fontFamilies.medium,
    fontWeight: "500",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 0,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  confirmButton: {
    height: PROFILE_FIELD_HEIGHT,
    borderRadius: 12,
    backgroundColor: colors.driver.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  confirmButtonText: {
    color: colors.white,
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
  },
  error: {
    color: colors.danger,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
  },
});
