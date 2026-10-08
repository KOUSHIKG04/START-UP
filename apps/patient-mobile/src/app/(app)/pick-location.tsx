import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { Header, useToast } from "@startup/mobile-ui";
import { useLocationDraft } from "../../features/locations/locationDraft";
import { formatGeocodedAddress } from "../../features/locations/locationDisplay";

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
  const initialPoint = useMemo(
    () => validPoint(first(params.latitude), first(params.longitude)),
    [params.latitude, params.longitude]
  );
  const [point, setPoint] = useState<Point | null>(initialPoint);
  const [details, setDetails] = useState<PlaceDetails>(emptyDetails);
  const [addressLabel, setAddressLabel] = useState("");
  const [locating, setLocating] = useState(false);
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

  async function useDeviceLocation() {
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
      const next = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setDetails(emptyDetails);
      setAddressLabel("");
      setPoint(next);
      const camera = { coordinates: next, zoom: 16 };
      if (Platform.OS === "android")
        googleMapRef.current?.setCameraPosition(camera);
      if (Platform.OS === "ios") appleMapRef.current?.setCameraPosition(camera);
    } catch {
      showToast({
        title: "Could not find your location",
        message: "Check location services and try again.",
        type: "error",
      });
    } finally {
      setLocating(false);
    }
  }

  useEffect(() => {
    if (!initialPoint) void useDeviceLocation();
  }, []);

  useEffect(() => {
    if (!point) return;
    let active = true;
    void Location.reverseGeocodeAsync(point)
      .then(([address]) => {
        if (!active) return;
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
        }
      });
    return () => {
      active = false;
    };
  }, [point?.latitude, point?.longitude]);

  function onMapPoint(coordinates: { latitude?: number; longitude?: number }) {
    const next = validPoint(coordinates.latitude, coordinates.longitude);
    if (next) {
      setDetails(emptyDetails);
      setAddressLabel("");
      setPoint(next);
    }
  }

  function confirm() {
    if (!point || !nativeMaps) return;
    choose({ ...point, ...details, addressId });
    if (fromAddress) router.back();
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
  const cameraPosition = point ? { coordinates: point, zoom: 16 } : undefined;
  const markers = point
    ? [{ id: "chosen-place", coordinates: point, title: "Selected place" }]
    : [];

  return (
    <View style={styles.screen}>
      <Header
        title="Choose Location"
        app="patient"
        onBackPress={() => router.back()}
      />
      <SafeAreaView edges={["bottom"]} style={styles.body}>
        <Text style={styles.instruction}>
          Tap the map to place the pin where your address is.
        </Text>
        <View style={styles.mapFrame}>
          {nativeMaps && point && Platform.OS === "android" ? (
            <nativeMaps.GoogleMaps.View
              ref={googleMapRef}
              style={styles.map}
              cameraPosition={cameraPosition}
              markers={markers}
              onMapClick={(event) => onMapPoint(event.coordinates)}
            />
          ) : null}
          {nativeMaps && point && Platform.OS === "ios" ? (
            <nativeMaps.AppleMaps.View
              ref={appleMapRef}
              style={styles.map}
              cameraPosition={cameraPosition}
              markers={markers}
              onMapClick={(event) => onMapPoint(event.coordinates)}
            />
          ) : null}
          {!point ? (
            <View style={styles.mapState}>
              {locating ? (
                <ActivityIndicator color={colors.patient.primary} />
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
                Map is unavailable in this app build. Update the app to choose
                an address.
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
            <Crosshair size={19} color={colors.patient.primary} />
            <Text style={styles.currentText}>Use Current Location</Text>
          </Pressable>
          {point ? (
            <View style={styles.place}>
              <MapPin size={20} color={colors.patient.primary} />
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
            disabled={!point || !nativeMaps}
            onPress={confirm}
            style={[styles.confirm, (!point || !nativeMaps) && styles.disabled]}
          >
            <Text style={styles.confirmText}>Confirm Location</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
  body: { flex: 1 },
  instruction: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
  },
  mapFrame: {
    flex: 1,
    minHeight: 240,
    backgroundColor: colors.patient.surface,
  },
  map: { flex: 1 },
  mapState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  stateText: {
    color: colors.patient.textSecondary,
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
    color: colors.patient.primary,
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
  place: { flexDirection: "row", alignItems: "center", gap: 10 },
  placeText: { flex: 1 },
  placeTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
  },
  coordinates: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
  },
  confirm: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: colors.patient.primary,
  },
  disabled: { opacity: 0.45 },
  confirmText: {
    color: colors.white,
    fontFamily: fontFamilies.bold,
    fontSize: 16,
  },
});
