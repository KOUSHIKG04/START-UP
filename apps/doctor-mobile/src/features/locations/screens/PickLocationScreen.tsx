import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Constants from "expo-constants";
import * as Location from "expo-location";
import type {
  AppleMaps as AppleMapsType,
  GoogleMaps as GoogleMapsType,
} from "expo-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { Crosshair, MapPin } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { Button, Header, Input, useToast } from "@startup/mobile-ui";
import { useLocationDraft } from "../locationDraft";
import { formatGeocodedAddress } from "../locationDisplay";

type Point = { latitude: number; longitude: number };
type PlaceDetails = {
  street: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
};
const emptyDetails: PlaceDetails = {
  street: "",
  locality: "",
  city: "",
  state: "",
  pincode: "",
};
const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function validPoint(latitude: unknown, longitude: unknown): Point | null {
  if (
    latitude === undefined ||
    longitude === undefined ||
    latitude === "" ||
    longitude === ""
  )
    return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
    ? { latitude: lat, longitude: lng }
    : null;
}

export default function PickLocationScreen() {
  const params = useLocalSearchParams();
  const addressId = first(params.id) ?? null;
  const fromAddress = first(params.from) === "address";
  const fromProfile = first(params.from) === "profile";
  const initialPoint = useMemo(
    () => validPoint(first(params.latitude), first(params.longitude)),
    [params.latitude, params.longitude]
  );
  const [point, setPoint] = useState<Point | null>(initialPoint);
  const [details, setDetails] = useState<PlaceDetails>(emptyDetails);
  const [addressLabel, setAddressLabel] = useState("");
  const [locating, setLocating] = useState(false);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [lookupVersion, setLookupVersion] = useState(0);
  const mapTouched = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const { showToast } = useToast();
  const choose = useLocationDraft((state) => state.choose);
  const googleMapRef = useRef<GoogleMapsType.MapView>(null);
  const appleMapRef = useRef<AppleMapsType.MapView>(null);
  const nativeMaps = useMemo(() => {
    if (Constants.appOwnership === "expo" || Platform.OS === "web") return null;
    if (
      Platform.OS === "android" &&
      Constants.expoConfig?.extra?.googleMapsConfigured !== true
    )
      return null;
    try {
      return require("expo-maps") as typeof import("expo-maps");
    } catch {
      return null;
    }
  }, []);

  async function searchAddress() {
    if (searching || locating) return;
    if (!search.trim()) { showToast({ title: "Enter an area or address", type: "info" }); return; }
    Keyboard.dismiss();
    setSearching(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error("Allow location access to search, or select a point on the map.");
      const [found] = await Location.geocodeAsync(search.trim());
      if (!mounted.current) return;
      const next = validPoint(found?.latitude, found?.longitude);
      if (!next) throw new Error("No location found. Try a more complete address.");
      setPoint(next);
      setLookupVersion(version => version + 1);
      const camera = { coordinates: next, zoom: 16 };
      if (Platform.OS === "android") googleMapRef.current?.setCameraPosition(camera);
      if (Platform.OS === "ios") appleMapRef.current?.setCameraPosition(camera);
    } catch (cause) {
      if (mounted.current) showToast({ title: "Could not find address", message: cause instanceof Error ? cause.message : "Try again.", type: "error" });
    } finally { if (mounted.current) setSearching(false); }
  }

  async function useDeviceLocation() {
    if (locating || searching) return;
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        showToast({
          title: "Location permission needed",
          message: "Allow location access to choose a place on the map.",
          type: "info",
        });
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!mounted.current) return;
      const next = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setDetails(emptyDetails);
      setAddressLabel("");
      setPoint(next);
      setLookupVersion(version => version + 1);
      const camera = { coordinates: next, zoom: 16 };
      if (Platform.OS === "android")
        googleMapRef.current?.setCameraPosition(camera);
      if (Platform.OS === "ios") appleMapRef.current?.setCameraPosition(camera);
    } catch {
      if (mounted.current) showToast({
        title: "Could not find your location",
        message: "Check location services and try again.",
        type: "error",
      });
    } finally {
      if (mounted.current) setLocating(false);
    }
  }

  useEffect(() => {
    if (!initialPoint) void useDeviceLocation();
  }, []);

  useEffect(() => {
    if (!point) return;
    let active = true;
    setResolving(true);
    setDetails(emptyDetails);
    setAddressLabel("");
    const timer = setTimeout(() => {
      void Location.reverseGeocodeAsync(point)
      .then(([address]) => {
        if (!active) return;
        if (!address) throw new Error("Address lookup returned no result.");
        setAddressLabel(formatGeocodedAddress(address));
        setDetails({
          street: address?.street ?? "",
          locality:
            address?.district || address?.subregion || address?.name || "",
          city: address?.city ?? "",
          state: address?.region ?? "",
          pincode: address?.postalCode?.replace(/\D/g, "").slice(0, 6) ?? "",
        });
      })
      .catch(() => {
        if (active) {
          setDetails(emptyDetails);
          setAddressLabel("");
          showToast({ title: "Address lookup unavailable", message: "You can confirm the coordinates and enter missing address details in the drawer.", type: "info" });
        }
      }).finally(() => { if (active) setResolving(false); });
    }, 600);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [point?.latitude, point?.longitude, lookupVersion]);

  function onMapPoint(coordinates: { latitude?: number; longitude?: number }, recenter = false) {
    const next = validPoint(coordinates.latitude, coordinates.longitude);
    if (next) {
      if (!recenter && point && Math.abs(next.latitude - point.latitude) < 0.000001 && Math.abs(next.longitude - point.longitude) < 0.000001) return;
      setDetails(emptyDetails);
      setAddressLabel("");
      setPoint(next);
      if (recenter) {
        const camera = { coordinates: next, zoom: 16 };
        if (Platform.OS === "android") googleMapRef.current?.setCameraPosition(camera);
        if (Platform.OS === "ios") appleMapRef.current?.setCameraPosition(camera);
      }
    }
  }

  function confirm() {
    if (!point || resolving || locating || searching) return;
    choose({ ...point, ...details, addressId });
    if (fromAddress || fromProfile) router.back();
    else router.replace("/address-details");
  }

  const placeLabel =
    addressLabel ||
    [
      details.street,
      details.locality,
      details.city,
      details.state,
      details.pincode,
    ]
      .filter(Boolean)
      .join(", ");
  const cameraPosition = useMemo(() => initialPoint ? { coordinates: initialPoint, zoom: 16 } : undefined, [initialPoint]);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Header
        title="Choose Location"
        app="doctor"
        onBackPress={() => router.back()}
      />
      <SafeAreaView edges={["bottom"]} style={styles.body}>
        <View style={styles.searchRow}>
          <Input accessibilityLabel="Search area or address" placeholder="Search an area or address"
            value={search} onChangeText={setSearch} returnKeyType="search" containerStyle={styles.searchInput}
            onSubmitEditing={() => void searchAddress()} />
          <Button theme="doctor" label="Search" loading={searching} disabled={searching || locating}
            onPress={() => void searchAddress()} />
        </View>
        <Text style={styles.instruction}>
          Drag the map beneath the pin or tap to choose your address.
        </Text>
        <View style={styles.mapFrame} onTouchStart={() => { mapTouched.current = true; }}>
          {nativeMaps && Platform.OS === "android" ? (
            <nativeMaps.GoogleMaps.View
              ref={googleMapRef}
              style={styles.map}
              cameraPosition={cameraPosition}
              onCameraMove={event => { if (point || mapTouched.current) onMapPoint(event.coordinates); }}
              onMapClick={(event) => onMapPoint(event.coordinates, true)}
            />
          ) : null}
          {nativeMaps && Platform.OS === "ios" ? (
            <nativeMaps.AppleMaps.View
              ref={appleMapRef}
              style={styles.map}
              cameraPosition={cameraPosition}
              onCameraMove={event => { if (point || mapTouched.current) onMapPoint(event.coordinates); }}
              onMapClick={(event) => onMapPoint(event.coordinates, true)}
            />
          ) : null}
          {nativeMaps ? <View pointerEvents="none" style={styles.pin}><MapPin size={36} fill={colors.white} color={colors.doctor.primary} /></View> : null}
          {!point && !nativeMaps ? (
            <View style={styles.mapState}>
              {locating ? (
                <ActivityIndicator color={colors.doctor.primary} />
              ) : (
                <Text style={styles.stateText}>
                  Use your current location to open the map.
                </Text>
              )}
            </View>
          ) : null}
          {point && !nativeMaps ? (
            <View style={styles.mapState}>
              <Text style={styles.stateText}>
                Map selection is unavailable in this build. You can still use
                your current location or search, then confirm below.
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.bottom}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void useDeviceLocation()}
            style={styles.currentButton}
          >
            <Crosshair size={19} color={colors.doctor.primary} />
            <Text style={styles.currentText}>Use Current Location</Text>
          </Pressable>
          {point ? (
            <View style={styles.place}>
              <MapPin size={20} color={colors.doctor.primary} />
              <View style={styles.placeText}>
                <Text
                  style={styles.placeTitle}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {placeLabel || "Selected map point"}
                </Text>
                <Text style={styles.coordinates}>
                  {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
                </Text>
              </View>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Confirm map location"
            disabled={!point || locating || searching || resolving}
            onPress={confirm}
            style={[styles.confirm, (!point || locating || searching || resolving) && styles.disabled]}
          >
            <Text style={styles.confirmText}>Confirm Location</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  body: { flex: 1 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16 },
  searchInput: { flex: 1 },
  pin: { position: "absolute", top: "50%", left: "50%", marginLeft: -18, marginTop: -36 },
  instruction: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    color: colors.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
  },
  mapFrame: {
    flex: 1,
    minHeight: 240,
    backgroundColor: colors.doctor.surface,
  },
  map: { flex: 1 },
  mapState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  stateText: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.medium,
    textAlign: "center",
  },
  bottom: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 13,
    backgroundColor: colors.white,
  },
  currentButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  currentText: {
    color: colors.doctor.primary,
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
  place: { flexDirection: "row", alignItems: "center", gap: 10 },
  placeText: { flex: 1 },
  placeTitle: {
    color: colors.doctor.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
  },
  coordinates: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
  },
  confirm: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: colors.doctor.primary,
  },
  disabled: { opacity: 0.45 },
  confirmText: {
    color: colors.white,
    fontFamily: fontFamilies.bold,
    fontSize: 16,
  },
});
