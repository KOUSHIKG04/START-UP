import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { searchMapPlaces } from "@startup/data-access";
import { mapPlaceSchema, type MapPlace } from "@startup/contracts";
import { supabase } from "../../../services/supabase";
import { LocateFixed, MapPin } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { Button, Header, Input, useToast } from "@startup/mobile-ui";
import { useLocationDraft } from "../locationDraft";
import { resolveDoctorAddress } from "../resolveAddress";

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
  const insets = useSafeAreaInsets();
  const addressId = first(params.id) ?? null;
  const fromAddress = first(params.from) === "address";
  const fromProfile = first(params.from) === "profile";
  const initialPoint = useMemo(
    () => validPoint(first(params.latitude), first(params.longitude)),
    [params.latitude, params.longitude]
  );
  const [point, setPoint] = useState<Point | null>(initialPoint);
  const pointRef = useRef<Point | null>(initialPoint);
  const initialPlace = useMemo(() => {
    try {
      const result = mapPlaceSchema.safeParse(JSON.parse(first(params.place) ?? "null"));
      return result.success && initialPoint && result.data.latitude === initialPoint.latitude && result.data.longitude === initialPoint.longitude ? result.data : null;
    } catch { return null; }
  }, [params.place, initialPoint]);
  const selectedPlace = useRef<MapPlace | null>(initialPlace);
  const operation = useRef(0);
  const [searchResults, setSearchResults] = useState<MapPlace[]>([]);
  const [details, setDetails] = useState<PlaceDetails>(emptyDetails);
  const [addressLabel, setAddressLabel] = useState("");
  const [locating, setLocating] = useState(false);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [lookupVersion, setLookupVersion] = useState(0);
  const mapTouched = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
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

  const onMapLoaded = useCallback(() => {
    // GPS/search can finish before the native map is ready. Apply the latest
    // selection once it loads instead of losing that initial camera update.
    if (pointRef.current) googleMapRef.current?.setCameraPosition({ coordinates: pointRef.current, zoom: 16, duration: 0 });
  }, []);

  function moveCamera(next: Point) {
    mapTouched.current = false;
    const camera = { coordinates: next, zoom: 16 };
    if (Platform.OS === "android") googleMapRef.current?.setCameraPosition({ ...camera, duration: 0 });
    if (Platform.OS === "ios") appleMapRef.current?.setCameraPosition(camera);
  }
  function chooseSearchResult(result: MapPlace) {
    operation.current += 1;
    selectedPlace.current = result;
    const next = { latitude: result.latitude, longitude: result.longitude };
    pointRef.current = next;
    setPoint(next); setSearchResults([]); setSearching(false); setLocating(false);
    setLookupVersion(version => version + 1);
    Keyboard.dismiss(); moveCamera(next);
  }
  async function searchAddress() {
    if (searching) return;
    if (search.trim().length < 2) { showToast({ title: "Enter an area or address", type: "info" }); return; }
    const request = ++operation.current;
    Keyboard.dismiss(); setSearching(true); setLocating(false); setSearchResults([]);
    try {
      if (supabase) {
        const results = await searchMapPlaces(supabase, { query: search.trim(), ...(pointRef.current ?? {}) });
        if (!mounted.current || request !== operation.current) return;
        if (results.configured) {
          setSearchResults(results.places);
          if (!results.places.length) showToast({ title: "No places found", message: "Try the locality, city or a more complete address.", type: "info" });
          return;
        }
      }
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error("Allow location access for device search, or choose a point on the map.");
      const [found] = await Location.geocodeAsync(search.trim());
      if (!mounted.current || request !== operation.current) return;
      const next = validPoint(found?.latitude, found?.longitude);
      if (!next) throw new Error("No location found. Try a more complete address.");
      selectedPlace.current = null; pointRef.current = next; setPoint(next);
      setLookupVersion(version => version + 1); moveCamera(next);
    } catch (cause) {
      if (mounted.current && request === operation.current) showToast({ title: "Could not find address", message: cause instanceof Error ? cause.message : "Try again.", type: "error" });
    } finally { if (mounted.current && request === operation.current) setSearching(false); }
  }
  async function useDeviceLocation() {
    if (locating || searching) return;
    const request = ++operation.current;
    setLocating(true); setSearchResults([]);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error("Allow location access or search for an address.");
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Location is taking too long. Search for an address or try outside.")), 15000); }),
      ]);
      if (!mounted.current || request !== operation.current) return;
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      selectedPlace.current = null; pointRef.current = next;
      setDetails(emptyDetails); setAddressLabel(""); setPoint(next);
      setLookupVersion(version => version + 1); moveCamera(next);
    } catch (cause) {
      if (mounted.current && request === operation.current) showToast({ title: "Could not find your location", message: cause instanceof Error ? cause.message : "Try again.", type: "error" });
    } finally {
      if (timer) clearTimeout(timer);
      if (mounted.current && request === operation.current) setLocating(false);
    }
  }

  useEffect(() => {
    if (!initialPoint) void useDeviceLocation();
  }, []);

  useEffect(() => {
    if (!point) return;
    const found = selectedPlace.current;
    if (found && found.latitude === point.latitude && found.longitude === point.longitude) {
      setDetails({ street: found.street, locality: found.locality, city: found.city, state: found.state, pincode: found.pincode });
      setAddressLabel(found.address); setResolving(false); return;
    }
    let active = true;
    setResolving(true);
    setDetails(emptyDetails);
    setAddressLabel("");
    const timer = setTimeout(() => {
      void resolveDoctorAddress(point, () => active)
        .then(address => {
          if (!active) return;
          setAddressLabel(address.address);
          setDetails({ street: address.street, locality: address.locality,
            city: address.city, state: address.state, pincode: address.pincode });
        })
        .catch((cause: unknown) => {
          if (active) {
            setDetails(emptyDetails);
            setAddressLabel("");
            showToast({
              title: "Could not fill this address",
              message: cause instanceof Error ? cause.message : "Retry the lookup or enter the address manually.",
              type: "error",
            });
          }
        })
        .finally(() => {
          if (active) setResolving(false);
        });
    }, 900);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [point?.latitude, point?.longitude, lookupVersion]);

  const onMapPoint = useCallback((coordinates: { latitude?: number; longitude?: number }, recenter = false) => {
    const next = validPoint(coordinates.latitude, coordinates.longitude);
    if (!next) return;
    const previous = pointRef.current;
    if (previous && Math.abs(next.latitude - previous.latitude) < 0.00001 && Math.abs(next.longitude - previous.longitude) < 0.00001) return;
    operation.current += 1;
    selectedPlace.current = null; pointRef.current = next;
    setSearching(false); setLocating(false); setSearchResults([]);
    setDetails(emptyDetails); setAddressLabel(""); setPoint(next);
    if (recenter) {
      mapTouched.current = false;
      const camera = { coordinates: next, zoom: 16 };
      if (Platform.OS === "android") googleMapRef.current?.setCameraPosition({ ...camera, duration: 0 });
      if (Platform.OS === "ios") appleMapRef.current?.setCameraPosition(camera);
    }
  }, []);
  const onCameraMove = useCallback((event: { coordinates: { latitude?: number; longitude?: number } }) => {
    if (mapTouched.current) onMapPoint(event.coordinates);
  }, [onMapPoint]);
  const onMapClick = useCallback((event: { coordinates: { latitude?: number; longitude?: number } }) => onMapPoint(event.coordinates, true), [onMapPoint]);

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
  const cameraPosition = useMemo(
    () => (initialPoint ? { coordinates: initialPoint, zoom: 16 } : undefined),
    [initialPoint]
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Header title="Choose Location" app="doctor" onBackPress={() => router.back()} />
      <View style={styles.body}>
        <View style={styles.mapFrame} onTouchStart={() => { mapTouched.current = true; }}>
          {nativeMaps && Platform.OS === "android" ? <nativeMaps.GoogleMaps.View ref={googleMapRef} style={styles.map} cameraPosition={cameraPosition} onMapLoaded={onMapLoaded} onCameraMove={onCameraMove} onMapClick={onMapClick} /> : null}
          {nativeMaps && Platform.OS === "ios" ? <nativeMaps.AppleMaps.View ref={appleMapRef} style={styles.map} cameraPosition={cameraPosition} onCameraMove={onCameraMove} onMapClick={onMapClick} /> : null}
          {nativeMaps ? <View pointerEvents="none" style={styles.pin}><MapPin size={36} fill={colors.white} color={colors.doctor.primary} /></View> : <View style={styles.mapState}><Text style={styles.stateText}>Map selection is unavailable in this build. You can search for a place or use your current location.</Text></View>}
        </View>
        <View style={styles.searchOverlay}>
          <View style={styles.searchRow}>
            <Input accessibilityLabel="Search area or address" placeholder="Search an area or address" value={search}
              onChangeText={value => { setSearch(value); setSearchResults([]); }} returnKeyType="search" containerStyle={styles.searchInput}
              onSubmitEditing={() => void searchAddress()} />
            <Button theme="doctor" label="Search" loading={searching} disabled={searching} onPress={() => void searchAddress()} />
          </View>
          {searchResults.length ? <View style={styles.results}>
            {searchResults.map(result => <Pressable key={result.id} accessibilityRole="button" onPress={() => chooseSearchResult(result)} style={styles.resultRow}>
              <MapPin size={18} color={colors.doctor.primary} /><View style={styles.resultCopy}><Text numberOfLines={1} style={styles.resultName}>{result.name}</Text><Text numberOfLines={2} style={styles.resultAddress}>{result.address}</Text></View>
            </Pressable>)}
            <Text style={styles.googleAttribution}>Google Maps</Text>
            {searchResults.flatMap(p => p.attributions).map((a, i) => <Text key={`${a.provider}-${i}`} style={styles.googleAttribution}>{a.provider}</Text>)}
          </View> : null}
        </View>
        <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button theme="doctor" variant="outline" label="Use Current Location" loading={locating} disabled={locating || searching}
            leftIcon={<LocateFixed size={19} color={colors.doctor.primary} />} onPress={() => void useDeviceLocation()} />
          {point ? <View style={styles.place}><MapPin size={20} color={colors.doctor.primary} /><Text style={styles.placeTitle} numberOfLines={2}>{placeLabel || "Selected map point"}</Text></View> : null}
          <Button theme="doctor" label="Confirm Location" loading={resolving} disabled={!point || locating || searching || resolving} onPress={confirm} style={styles.confirm} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  body: { flex: 1 },
  searchOverlay: { position: "absolute", top: 16, left: 16, right: 16, gap: 8 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, minWidth: 0 },
  results: { backgroundColor: colors.white, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.border },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  resultCopy: { flex: 1 },
  resultName: { fontFamily: fontFamilies.medium, fontSize: 14, color: colors.textPrimary },
  resultAddress: { fontFamily: fontFamilies.regular, fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  googleAttribution: { fontFamily: fontFamilies.regular, color: "#5E5E5E", fontSize: 12 },
  pin: { position: "absolute", top: "50%", left: "50%", marginLeft: -18, marginTop: -36 },
  instruction: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    color: colors.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
  },
  mapFrame: { ...StyleSheet.absoluteFill, backgroundColor: colors.doctor.surface },
  map: { ...StyleSheet.absoluteFill },
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
    position: "absolute", bottom: 12, left: 0, right: 0,
    marginHorizontal: 16, marginBottom: 8, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
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
    flex: 1,
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
