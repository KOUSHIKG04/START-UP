import { Button } from "@startup/mobile-ui";
import { ModalSurface } from "@startup/mobile-ui";
import { Input, useToastFeedback } from "@startup/mobile-ui";
import { useCallback, useEffect, useId, useState } from "react";
import { router, useFocusEffect, type Href } from "expo-router";
import { useLocationDraft } from "../../locations/locationDraft";
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
import { useMobileSession } from "../../../services/supabase";
import { MapPin, X } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { emptyAddress, type PatientAddress } from "./addressTypes";
import {
  PROFILE_FIELD_HEIGHT,
  PROFILE_PLACEHOLDER_COLOR,
  profileFormStyles,
} from "./profileFormStyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { patientAddressSchema } from "@startup/contracts";

export type { PatientAddress };

export function AddressSheet({
  visible,
  value,
  onClose,
  onConfirm,
  onReopen,
}: {
  visible: boolean;
  value: PatientAddress;
  onClose: () => void;
  onConfirm: (address: PatientAddress) => void;
  onReopen: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { profile } = useMobileSession();
  const [address, setAddress] = useState<PatientAddress>(value);
  const [error, setError] = useState("");
  useToastFeedback({ error });
  const [attemptedConfirm, setAttemptedConfirm] = useState(false);
  const mapDraftId = useId();
  const chosen = useLocationDraft(state => state.chosen);
  const clearChosen = useLocationDraft(state => state.clear);
  useFocusEffect(useCallback(() => {
    if (!chosen || chosen.addressId !== mapDraftId) return;
    setAddress(current => ({ ...current, line1: chosen.street || chosen.locality || current.line1,
      line2: chosen.locality || current.line2, city: chosen.city || current.city, state: chosen.state || current.state, pincode: chosen.pincode || current.pincode,
      latitude: chosen.latitude, longitude: chosen.longitude }));
    clearChosen();
    onReopen();
  }, [chosen, mapDraftId, clearChosen, onReopen]));

  // Only a new confirmed address replaces the draft. Dismissing the drawer
  // must not reset partially entered fields when it is opened again.
  useEffect(() => {
    setAddress(value || emptyAddress);
    setAttemptedConfirm(false);
  }, [value]);
  useEffect(() => {
    if (visible) setError("");
  }, [visible]);

  function handleConfirm() {
    setAttemptedConfirm(true);
    const trimmed: PatientAddress = {
      building: address.building.trim(),
      line1: address.line1.trim(),
      line2: address.line2.trim(),
      city: address.city.trim(),
      state: address.state.trim(),
      pincode: address.pincode.trim(),
      ...(address.latitude !== undefined && address.longitude !== undefined
        ? { latitude: address.latitude, longitude: address.longitude } : {}),
    };

    if (!trimmed.building) {
      setError("Please enter House No. / Flat / Building.");
      return;
    }
    if (!trimmed.line1) {
      setError("Please enter Address Line 1.");
      return;
    }
    if (trimmed.city.length < 2) {
      setError("Please enter a valid City name.");
      return;
    }
    if (trimmed.state.length < 2) {
      setError("Please enter a valid State name.");
      return;
    }
    if (!/^\d{6}$/.test(trimmed.pincode)) {
      setError("Please enter a valid 6-digit pincode.");
      return;
    }

    setError("");
    Keyboard.dismiss();
    onConfirm(trimmed);
  }

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
          invalid={attemptedConfirm && !patientAddressSchema.shape[key].safeParse(address[key].trim()).success}
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
    <ModalSurface layout="custom"
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

              <Button theme="patient" label="Choose location on map" variant="outline"
                leftIcon={<MapPin size={18} color={colors.patient.primaryDark} />}
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                  clearChosen();
                  router.push({ pathname: profile?.patient_profile_complete ? '/pick-location' : '/profile-location', params: {
                    from: 'profile', id: mapDraftId,
                    ...(address.latitude !== undefined && address.longitude !== undefined ? {
                      latitude: String(address.latitude), longitude: String(address.longitude),
                    } : {}),
                  } } as Href);
                }} style={[styles.locationCard, { height: PROFILE_FIELD_HEIGHT, paddingVertical: 0 }]} />
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
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderDefault,
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
    backgroundColor: colors.patient.primaryDark,
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
