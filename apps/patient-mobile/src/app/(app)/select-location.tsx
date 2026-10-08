import { Button } from "@startup/mobile-ui";
import { Input } from "@startup/mobile-ui";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  deleteMyPatientLocation,
  listMyPatientLocations,
  saveMyPatientLocation,
  selectMyPatientLocation,
} from "@startup/data-access";
import type { SavedPatientLocation } from "@startup/contracts";
import { colors, fontFamilies } from "@startup/design-tokens";
import { Header, useToast, useToastFeedback } from "@startup/mobile-ui";
import {
  LocateFixed,
  House,
  MapPin,
  MoreVertical,
  Plus,
  Search,
} from "lucide-react-native";
import { supabase, useMobileSession } from "../../services/supabase";
import {
  distanceToSavedLocation,
  formatGeocodedAddress,
  formatSavedLocation,
} from "../../features/locations/locationDisplay";
import { canGeocodeAddress } from "../../features/locations/geocoding";

type Place = { latitude: number; longitude: number; addressLabel: string };

export default function SelectLocationScreen() {
  const { profile } = useMobileSession();
  const client = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [devicePosition, setDevicePosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  useEffect(() => {
    let active = true;
    void (async () => {
      const permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) return;
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (active)
        setDevicePosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
    })().catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  const locations = useQuery({
    queryKey: ["my-patient-locations", profile?.patient_id],
    queryFn: () => listMyPatientLocations(supabase!),
    enabled: Boolean(supabase && profile?.patient_id),
  });
  useToastFeedback({
    error: locations.isError
      ? "Could not load saved addresses. Reopen this page to retry."
      : "",
  });

  async function refresh() {
    await client.invalidateQueries({ queryKey: ["my-patient-locations"] });
  }

  async function searchPlaces() {
    if (search.trim().length < 3) {
      showToast({ title: "Enter an area or address", type: "info" });
      return;
    }
    if (busy) return;
    setBusy(true);
    setPendingAction("search");
    try {
      if (!(await canGeocodeAddress())) {
        showToast({
          title: "Location permission needed",
          message: "Allow location access to search addresses on this device.",
          type: "info",
        });
        return;
      }
      const points = (await Location.geocodeAsync(search.trim())).slice(0, 5);
      const found = await Promise.all(
        points.map(async (point) => {
          const [address] = await Location.reverseGeocodeAsync(point).catch(
            () => []
          );
          return {
            latitude: point.latitude,
            longitude: point.longitude,
            addressLabel: formatGeocodedAddress(address, search.trim()),
          };
        })
      );
      setMatches(found);
      if (!found.length)
        showToast({
          title: "No locations found",
          message: "Try a more specific address.",
          type: "info",
        });
    } catch {
      showToast({
        title: "Location search unavailable",
        message: "Try again or use your current location.",
        type: "error",
      });
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function useCurrentLocation() {
    if (busy) return;
    setBusy(true);
    setPendingAction("current");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        showToast({
          title: "Location permission needed",
          message: "Allow location access or add an address manually.",
          type: "info",
        });
        return;
      }
      const point = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      router.push({
        pathname: "/pick-location",
        params: {
          latitude: String(point.coords.latitude),
          longitude: String(point.coords.longitude),
        },
      });
    } catch {
      showToast({
        title: "Could not use current location",
        message: "Try again or add an address.",
        type: "error",
      });
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function choose(location: SavedPatientLocation) {
    if (!supabase) return;
    if (busy) return;
    setBusy(true);
    setPendingAction(`choose:${location.id}`);
    try {
      if (location.latitude === null || location.longitude === null) {
        if (await canGeocodeAddress()) {
          const [point] = await Location.geocodeAsync(
            formatSavedLocation(location)
          ).catch(() => []);
          if (point)
            await saveMyPatientLocation(
              supabase,
              {
                label: location.label,
                kind: location.kind,
                building: location.building || undefined,
                street: location.street || undefined,
                locality: location.locality || undefined,
                city: location.city || undefined,
                state: location.state || undefined,
                pincode: location.pincode || undefined,
                instructions: location.instructions || undefined,
                use_account_details: location.use_account_details,
                receiver_name: location.receiver_name || undefined,
                receiver_phone: location.receiver_phone || undefined,
                latitude: point.latitude,
                longitude: point.longitude,
              },
              location.id
            );
        }
      }
      await selectMyPatientLocation(supabase, location.id);
      await refresh();
      router.back();
    } catch {
      showToast({
        title: "Could not select this address",
        message: "Edit the address to set a precise location.",
        type: "error",
      });
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function remove(location: SavedPatientLocation) {
    if (!supabase) return;
    if (busy) return;
    setBusy(true);
    setPendingAction(`remove:${location.id}`);
    try {
      await deleteMyPatientLocation(supabase, location.id);
      setMenuId(null);
      await refresh();
      showToast({ title: "Address removed", type: "success" });
    } catch {
      showToast({ title: "Could not remove address", type: "error" });
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  return (
    <View style={styles.screen}>
      <Header
        title="Select Your Location"
        app="patient"
        onBackPress={() => router.back()}
      />
      <SafeAreaView edges={["bottom"]} style={styles.body}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.searchRow}>
            <Input
              variant="unstyled"
              accessibilityLabel="Search an area or address"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => void searchPlaces()}
              returnKeyType="search"
              placeholder="Search an area or address"
              placeholderTextColor="#888C94"
              style={styles.searchInput}
            />
            <Button
              loading={pendingAction === "search"}
              disabled={busy}
              variant="ghost"
              label="Search locations"
              labelStyle={styles.actionText}
              accessibilityLabel="Search locations"
              onPress={() => void searchPlaces()}
            >
              <Search size={22} color="#69717A" />
            </Button>
          </View>
          <View style={styles.actions}>
            <Button
              loading={pendingAction === "current"}
              disabled={busy}
              variant="ghost"
              label="Use Current Location"
              labelStyle={styles.actionText}
              accessibilityRole="button"
              onPress={() => void useCurrentLocation()}
              style={styles.action}
              leftIcon={
                <LocateFixed size={20} color={colors.patient.primary} />
              }
            />
            <Button
              label="Add New Address"
              variant="ghost"
              labelStyle={styles.actionText}
              accessibilityRole="button"
              onPress={() => router.push("/pick-location")}
              style={styles.action}
              leftIcon={<Plus size={20} color={colors.patient.primary} />}
            />
          </View>

          {matches.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SEARCH RESULTS</Text>
              <View style={styles.card}>
                {matches.map((place, index) => (
                  <Pressable
                    key={`${place.latitude}-${place.longitude}-${index}`}
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({
                        pathname: "/pick-location",
                        params: {
                          latitude: String(place.latitude),
                          longitude: String(place.longitude),
                        },
                      })
                    }
                    style={styles.placeRow}
                  >
                    <MapPin size={20} color={colors.patient.primary} />
                    <Text
                      style={styles.placeText}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {place.addressLabel}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Saved Addresses</Text>
            {locations.isLoading ? (
              <ActivityIndicator color={colors.patient.primary} />
            ) : null}
            {locations.data?.length === 0 ? (
              <Text style={styles.helper}>
                No saved addresses yet. Add one or use your current location.
              </Text>
            ) : null}
            {locations.data?.length ? (
              <View style={styles.savedCards}>
                {locations.data.map((location: SavedPatientLocation) => (
                  <View
                    key={location.id}
                    style={[
                      styles.savedRow,
                      location.selected && styles.selectedCard,
                      menuId === location.id && styles.menuOpenRow,
                    ]}
                  >
                    <Button
                      loading={pendingAction === `choose:${location.id}`}
                      disabled={busy}
                      variant="ghost"
                      label="Select address"
                      labelStyle={styles.actionText}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${location.label}`}
                      onPress={() => void choose(location)}
                      style={styles.savedBody}
                    >
                      <View style={styles.iconBox}>
                        {location.kind === "house" ? (
                          <House size={24} color={colors.patient.text} />
                        ) : (
                          <MapPin size={24} color={colors.patient.text} />
                        )}
                        {distanceToSavedLocation(devicePosition, location) ? (
                          <Text style={styles.distance}>
                            {distanceToSavedLocation(devicePosition, location)}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.savedText}>
                        <View style={styles.labelRow}>
                          <Text
                            style={styles.name}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {location.label}
                          </Text>
                          {location.selected ? (
                            <Text style={styles.selected}>Selected</Text>
                          ) : null}
                        </View>
                        <Text
                          style={styles.address}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {formatSavedLocation(location) || "GPS location"}
                        </Text>
                      </View>
                    </Button>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`More options for ${location.label}`}
                      style={styles.moreButton}
                      onPress={() =>
                        setMenuId(menuId === location.id ? null : location.id)
                      }
                      hitSlop={12}
                    >
                      <MoreVertical size={22} color={colors.patient.text} />
                    </Pressable>
                    {menuId === location.id ? (
                      <View style={styles.menu}>
                        <Button
                          label="Edit address"
                          variant="ghost"
                          labelStyle={styles.menuText}
                          accessibilityRole="button"
                          disabled={busy}
                          style={styles.menuAction}
                          onPress={() => {
                            setMenuId(null);
                            router.push({
                              pathname: "/address-details",
                              params: { id: location.id },
                            });
                          }}
                        />
                        <Button
                          loading={pendingAction === `remove:${location.id}`}
                          disabled={busy}
                          variant="ghost"
                          label="Delete address"
                          labelStyle={styles.menuText}
                          style={styles.menuAction}
                          accessibilityRole="button"
                          onPress={() => void remove(location)}
                        />
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
  body: { flex: 1 },
  content: { padding: 16, paddingBottom: 60, gap: 18 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#D8DADD",
    borderRadius: 14,
    paddingHorizontal: 16,
    minHeight: 54,
  },
  searchInput: {
    flex: 1,
    color: colors.patient.text,
    fontFamily: fontFamilies.regular,
    fontSize: 16,
  },
  actions: { flexDirection: "row", gap: 10 },
  action: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  actionText: {
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
    lineHeight: 18,
    flexShrink: 1,
  },
  progress: { paddingVertical: 8 },
  section: { gap: 12, marginTop: 8 },
  sectionTitle: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    letterSpacing: 0.4,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingHorizontal: 14,
  },
  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F2",
  },
  placeText: {
    flex: 1,
    color: colors.patient.text,
    fontFamily: fontFamilies.medium,
    fontSize: 15,
  },
  savedRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D9DDE0",
    position: "relative",
  },
  savedCards: { gap: 12 },
  selectedCard: { borderColor: "#D9DDE0" },
  menuOpenRow: { zIndex: 3 },
  savedBody: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    gap: 12,
    paddingHorizontal: 0,
    paddingVertical: 0,
    minHeight: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
  },
  moreButton: {
    width: 28,
    height: 28,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  menuAction: {
    width: "100%",
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 40,
    borderRadius: 8,
    justifyContent: "flex-start",
    backgroundColor: "transparent",
  },
  iconBox: {
    width: 56,
    flexShrink: 0,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.patient.surface,
    borderRadius: 10,
    gap: 3,
  },
  distance: {
    color: colors.patient.text,
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    lineHeight: 16,
  },
  savedText: { flex: 1, minWidth: 0, gap: 5 },
  addressMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 3,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 24,
  },
  name: {
    flexShrink: 1,
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
    lineHeight: 22,
  },
  selected: {
    flexShrink: 0,
    color: colors.patient.primaryDark,
    backgroundColor: colors.patient.surface,
    overflow: "hidden",
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontFamily: fontFamilies.semibold,
    fontSize: 11,
    lineHeight: 16,
  },
  address: {
    color: "#626870",
    fontFamily: fontFamilies.regular,
    fontSize: 13.5,
    lineHeight: 20,
  },
  menu: {
    position: "absolute",
    right: 12,
    top: 44,
    zIndex: 3,
    width: 140,
    backgroundColor: colors.white,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E6E7",
    elevation: 6,
  },
  menuText: {
    color: colors.patient.text,
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  helper: { color: "#626870", fontFamily: fontFamilies.regular, fontSize: 14 },
});
