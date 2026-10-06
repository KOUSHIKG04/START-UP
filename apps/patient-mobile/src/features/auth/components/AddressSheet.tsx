import { useToastFeedback } from "@startup/mobile-ui";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Location from "expo-location";
import { MapPin, XCircle } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { emptyAddress, type PatientAddress } from "./addressTypes";

export type { PatientAddress };

export function AddressSheet({
  visible,
  value,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  value: PatientAddress;
  onClose: () => void;
  onConfirm: (address: PatientAddress) => void;
}) {
  const [address, setAddress] = useState<PatientAddress>(value);
  const [error, setError] = useState("");
  useToastFeedback({ error });
  const [isLocating, setIsLocating] = useState(false);

  const [prevVisible, setPrevVisible] = useState(visible);
  const [prevValue, setPrevValue] = useState(value);

  if (visible !== prevVisible || value !== prevValue) {
    setPrevVisible(visible);
    setPrevValue(value);
    if (visible) {
      setAddress(value || emptyAddress);
      setError("");
    }
  }

  async function fetchLocation() {
    try {
      setError("");
      setIsLocating(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setError("Allow location access to fill in your address details.");
        return;
      }
      const point = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [found] = await Location.reverseGeocodeAsync(point.coords);
      if (found) {
        setAddress((current) => ({
          ...current,
          building: current.building || found.name || "",
          line1: found.street || found.district || current.line1,
          line2:
            found.subregion && found.subregion !== found.city
              ? found.subregion
              : current.line2,
          city: found.city || current.city,
          state: found.region || current.state,
          pincode: found.postalCode
            ? found.postalCode.replace(/\D/g, "").slice(0, 6)
            : current.pincode,
        }));
      }
    } catch {
      setError("Location is unavailable. Enter the address manually.");
    } finally {
      setIsLocating(false);
    }
  }

  function handleConfirm() {
    const trimmed: PatientAddress = {
      building: address.building.trim(),
      line1: address.line1.trim(),
      line2: address.line2.trim(),
      city: address.city.trim(),
      state: address.state.trim(),
      pincode: address.pincode.trim(),
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
    onConfirm(trimmed);
  }

  function renderField(
    label: string,
    key: keyof PatientAddress,
    placeholder: string,
    keyboardType: "default" | "number-pad" = "default",
    maxLength?: number
  ) {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          accessibilityLabel={label}
          placeholder={placeholder}
          placeholderTextColor="#A6A6A6"
          value={address[key]}
          keyboardType={keyboardType}
          maxLength={maxLength}
          onChangeText={(text) => {
            setError("");
            setAddress((current) => ({ ...current, [key]: text }));
          }}
          style={styles.input}
        />
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
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
                <XCircle size={22} color="#8E9BAE" />
              </Pressable>
            </View>

            {/* Scrollable Content */}
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.content}
            >
              {/* Fetch Location Card */}
              <Pressable
                accessibilityRole="button"
                onPress={() => void fetchLocation()}
                style={styles.locationCard}
              >
                <View style={styles.iconContainer}>
                  {isLocating ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.patient.primaryDark}
                    />
                  ) : (
                    <MapPin size={18} color={colors.patient.primaryDark} />
                  )}
                </View>
                <View style={styles.locationTextContainer}>
                  <Text style={styles.locationTitle}>Fetch current location</Text>
                  <Text style={styles.locationSub}>
                    Use your device location to fill in your address details.
                  </Text>
                </View>
              </Pressable>



              {/* Form Fields */}
              <View style={styles.fieldsContainer}>
                {renderField(
                  "House No. / Flat / Building",
                  "building",
                  "e.g. 42, Sunshine Apartments"
                )}
                {renderField(
                  "Address Line 1",
                  "line1",
                  "Street name, area"
                )}
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  sheetContainer: {
    width: "100%",
  },
  sheet: {
    maxHeight: "88%",
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
    paddingBottom: 36,
    gap: 20,
  },
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
    gap: 6,
  },
  label: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: "#666666",
  },
  input: {
    height: 40,
    backgroundColor: "#F7F7F7",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  confirmButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.patient.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  confirmButtonText: {
    color: colors.white,
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
  },
});
