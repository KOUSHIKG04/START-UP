import { StatusBar } from "expo-status-bar";
import { Button } from "@startup/mobile-ui";
import { Input } from "@startup/mobile-ui";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  listMyDriverLocations,
  saveMyDriverLocation,
  selectMyDriverLocation,
} from "@startup/data-access";
import type {
  SavedDriverLocation,
  SavedDriverLocationInput,
} from "@startup/contracts";
import { colors, fontFamilies } from "@startup/design-tokens";
import { Header, useToast, useToastFeedback } from "@startup/mobile-ui";
import { BriefcaseBusiness, House, MapPin } from "lucide-react-native";
import { supabase, useMobileSession } from "../../services/supabase";
import { useLocationDraft } from "../../features/locations/savedLocationDraft";

type Kind = "house" | "office" | "other";
const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function AddressDetailsScreen() {
  const params = useLocalSearchParams();
  const id = first(params.id);
  const { profile } = useMobileSession();
  const client = useQueryClient();
  const { showToast } = useToast();
  const saved = useQuery({
    queryKey: ["my-driver-locations", profile?.driver?.id],
    queryFn: () => listMyDriverLocations(supabase!),
    enabled: Boolean(supabase && profile?.driver?.id),
  });
  useToastFeedback({
    error: saved.isError
      ? "Could not load this address. Reopen the page to retry."
      : "",
  });
  const existing = saved.data?.find(
    (item: SavedDriverLocation) => item.id === id
  );
  const chosen = useLocationDraft((state) => state.chosen);
  const clearChosen = useLocationDraft((state) => state.clear);
  const chosenForForm = chosen?.addressId === (id ?? null) ? chosen : null;
  const [initializedId, setInitializedId] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>("house");
  const [label, setLabel] = useState("");
  const [building, setBuilding] = useState("");
  const [street, setStreet] = useState(first(params.street) || "");
  const [locality, setLocality] = useState(first(params.locality) || "");
  const [city, setCity] = useState(first(params.city) || "");
  const [state, setState] = useState(first(params.state) || "");
  const [pincode, setPincode] = useState(first(params.pincode) || "");
  const [instructions, setInstructions] = useState("");
  const [useAccountDetails, setUseAccountDetails] = useState(true);
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!existing || initializedId === existing.id) return;
    setInitializedId(existing.id);
    setKind(existing.kind === "current" ? "other" : existing.kind);
    setLabel(existing.label);
    setBuilding(existing.building || "");
    setStreet(chosenForForm?.street || existing.street || "");
    setLocality(chosenForForm?.locality || existing.locality || "");
    setCity(chosenForForm?.city || existing.city || "");
    setState(chosenForForm?.state || existing.state || "");
    setPincode(chosenForForm?.pincode || existing.pincode || "");
    setInstructions(existing.instructions || "");
    setUseAccountDetails(existing.use_account_details);
    setReceiverName(existing.receiver_name || "");
    setReceiverPhone(existing.receiver_phone || "");
  }, [existing, initializedId]);

  useEffect(() => {
    if (!chosenForForm) return;
    setStreet(chosenForForm.street);
    setLocality(chosenForForm.locality);
    setCity(chosenForForm.city);
    setState(chosenForForm.state);
    setPincode(chosenForForm.pincode);
  }, [chosenForForm]);

  const mapPoint =
    chosenForForm ??
    (existing?.latitude !== null &&
    existing?.latitude !== undefined &&
    existing?.longitude !== null &&
    existing?.longitude !== undefined
      ? { latitude: existing.latitude, longitude: existing.longitude }
      : null);
  const addressLabel =
    kind === "house" ? "Home" : kind === "office" ? "Office" : label.trim();

  async function save() {
    if (!supabase) return;
    if (
      !building.trim() ||
      !addressLabel ||
      !locality.trim() ||
      !city.trim() ||
      !state.trim()
    ) {
      showToast({
        title: "Complete the address",
        message:
          "Building, locality, city, state and address name are required.",
        type: "error",
      });
      return;
    }
    if (pincode.trim() && !/^\d{6}$/.test(pincode.trim())) {
      showToast({
        title: "Check the pincode",
        message: "Enter six digits, or leave it empty.",
        type: "error",
      });
      return;
    }
    if (!mapPoint) {
      showToast({
        title: "Choose a map location",
        message: "Confirm the place on the map before saving this address.",
        type: "info",
      });
      return;
    }
    setBusy(true);
    try {
      const value: SavedDriverLocationInput = {
        label: addressLabel,
        kind,
        building: building.trim(),
        street: street.trim(),
        locality: locality.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim() || undefined,
        latitude: mapPoint.latitude,
        longitude: mapPoint.longitude,
        instructions: instructions.trim(),
        use_account_details: useAccountDetails,
        receiver_name: useAccountDetails ? undefined : receiverName.trim(),
        receiver_phone: useAccountDetails ? undefined : receiverPhone.trim(),
      };
      const savedId = await saveMyDriverLocation(supabase, value, id);
      if (!id) await selectMyDriverLocation(supabase, savedId);
      await client.invalidateQueries({ queryKey: ["my-driver-locations"] });
      clearChosen();
      showToast({
        title: id ? "Address updated" : "Address saved",
        type: "success",
      });
      router.back();
    } catch (cause) {
      const message =
        cause instanceof Error && cause.message.includes("receiver")
          ? "Enter a receiver name and phone number starting with + and country code."
          : "Check the address and try again.";
      showToast({ title: "Could not save address", message, type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Header
        title={id ? "Edit Address" : "Add New Address"}
        app="driver"
        onBackPress={() => {
          clearChosen();
          router.back();
        }}
      />
      <SafeAreaView edges={["bottom"]} style={styles.screen}>
        <KeyboardAvoidingView
          style={styles.screen}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {!mapPoint ? (
              <Text style={styles.muted}>
                Choose and confirm a place on the map before saving this
                address.
              </Text>
            ) : null}
            <View style={styles.card}>
              <View style={styles.kindRow}>
                {(
                  [
                    ["house", "Home", House],
                    ["office", "Office", BriefcaseBusiness],
                    ["other", "Other", MapPin],
                  ] as const
                ).map(([value, title, Icon]) => (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: kind === value }}
                    onPress={() => setKind(value)}
                    style={[styles.kind, kind === value && styles.kindSelected]}
                  >
                    <Icon
                      size={16}
                      color={
                        kind === value ? colors.white : colors.driver.text
                      }
                    />
                    <Text
                      style={[
                        styles.kindText,
                        kind === value && styles.kindTextSelected,
                      ]}
                    >
                      {title}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Input
                variant="unstyled"
                accessibilityLabel="Building or floor"
                label="Building / Floor *"
                labelStyle={styles.fieldLabel}
                placeholderTextColor="#9CA3AF"
                placeholder="Enter building and floor"
                value={building}
                onChangeText={setBuilding}
                style={styles.input}
              />
              <Input
                variant="unstyled"
                accessibilityLabel="Street"
                label="Street"
                labelStyle={styles.fieldLabel}
                placeholderTextColor="#9CA3AF"
                placeholder="Enter street name"
                value={street}
                onChangeText={setStreet}
                style={styles.input}
              />
              <View style={styles.localityRow}>
                <Input
                  variant="unstyled"
                  accessibilityLabel="Area or locality"
                  label="Area / Locality *"
                  labelStyle={styles.fieldLabel}
                  placeholderTextColor="#9CA3AF"
                  placeholder="Enter area or locality"
                  value={locality}
                  onChangeText={setLocality}
                  containerStyle={styles.localityInput}
                  style={styles.input}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change map location"
                  onPress={() =>
                    router.push({
                      pathname: "/pick-location",
                      params: {
                        from: "address",
                        id: id ?? "",
                        latitude: mapPoint ? String(mapPoint.latitude) : "",
                        longitude: mapPoint ? String(mapPoint.longitude) : "",
                      },
                    })
                  }
                  style={styles.change}
                >
                  <MapPin size={18} color={colors.driver.primary} />
                  <Text style={styles.changeText}>Change</Text>
                </Pressable>
              </View>
              <View style={styles.split}>
                <Input
                  variant="unstyled"
                  accessibilityLabel="City"
                  label="City *"
                  labelStyle={styles.fieldLabel}
                  placeholderTextColor="#9CA3AF"
                  placeholder="Enter city"
                  value={city}
                  onChangeText={setCity}
                  containerStyle={styles.half}
                  style={styles.input}
                />
                <Input
                  variant="unstyled"
                  accessibilityLabel="State"
                  label="State *"
                  labelStyle={styles.fieldLabel}
                  placeholderTextColor="#9CA3AF"
                  placeholder="Enter state"
                  value={state}
                  onChangeText={setState}
                  containerStyle={styles.half}
                  style={styles.input}
                />
              </View>
              <Input
                variant="unstyled"
                accessibilityLabel="Pincode"
                label="Pincode"
                labelStyle={styles.fieldLabel}
                placeholderTextColor="#9CA3AF"
                placeholder="Enter six-digit pincode"
                keyboardType="number-pad"
                maxLength={6}
                value={pincode}
                onChangeText={setPincode}
                style={styles.input}
              />
              {kind === "other" ? (
                <Input
                  variant="unstyled"
                  accessibilityLabel="Save address as"
                  label=" as *"
                  labelStyle={styles.fieldLabel}
                  placeholderTextColor="#9CA3AF"
                  placeholder="e.g. Parents’ home"
                  value={label}
                  onChangeText={setLabel}
                  style={styles.input}
                />
              ) : null}
            </View>
            <Button
              loading={busy}
              label="Save Address"
              variant="primary"
              labelStyle={styles.saveText}
              accessibilityRole="button"
              accessibilityLabel="Save address"
              accessibilityState={{ disabled: busy || !mapPoint }}
              disabled={busy || !mapPoint}
              onPress={() => void save()}
              style={[styles.save, (busy || !mapPoint) && styles.saveDisabled]}
            >
              <Text style={styles.saveText}>
                {busy ? "Saving address…" : "Save Address"}
              </Text>
            </Button>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { padding: 16, gap: 16, paddingBottom: 56 },
  sectionTitle: {
    color: colors.driver.text,
    fontFamily: fontFamilies.bold,
    fontSize: 20,
  },
  recommended: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 16,
  },
  receiver: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.white,
  },
  check: {
    width: 22,
    height: 22,
    overflow: "hidden",
    textAlign: "center",
    textAlignVertical: "center",
    borderRadius: 5,
    color: colors.white,
    backgroundColor: colors.driver.primary,
    fontFamily: fontFamilies.bold,
  },
  strong: {
    color: colors.driver.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
  },
  muted: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    marginTop: 3,
  },
  card: { backgroundColor: colors.white, borderRadius: 17, gap: 13 },
  kindRow: {
    flexDirection: "row",
    backgroundColor: colors.white,
    padding: 4,
    borderRadius: 24,
    marginBottom: 3,
    elevation: 3,
    shadowColor: colors.driver.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  kind: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    minHeight: 38,
    borderRadius: 20,
  },
  kindSelected: { backgroundColor: colors.driver.primary },
  kindText: {
    color: colors.driver.text,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
  },
  kindTextSelected: { color: colors.white },
  fieldLabel: {
    color: colors.driver.text,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    height: 52,
    minHeight: 52,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: "#D9DDE0",
    borderRadius: 12,
    paddingHorizontal: 13,
    backgroundColor: colors.white,
    color: colors.driver.text,
    fontFamily: fontFamilies.regular,
    fontSize: 15,
  },
  localityRow: { flexDirection: "row", gap: 8 },
  localityInput: { flex: 1, minWidth: 0 },
  change: {
    height: 52,
    alignSelf: "flex-end",
    width: 96,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D9DDE0",
  },
  changeText: {
    color: colors.driver.primary,
    fontFamily: fontFamilies.semibold,
    fontSize: 11,
  },
  split: { flexDirection: "row", gap: 8 },
  half: { flex: 1 },
  instructions: {
    minHeight: 78,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
  save: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: colors.driver.primary,
    marginTop: 8,
  },
  saveDisabled: { opacity: 0.65 },
  saveText: {
    color: colors.white,
    fontFamily: fontFamilies.bold,
    fontSize: 16,
  },
});
