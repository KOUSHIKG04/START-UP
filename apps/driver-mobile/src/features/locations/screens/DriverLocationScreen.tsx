import { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Platform, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Constants from "expo-constants";
import * as Location from "expo-location";
import type { AppleMaps, GoogleMaps } from "expo-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { MapPin } from "lucide-react-native";
import { Button, Header, Input, Loader, useToast } from "@startup/mobile-ui";
import { colors, fontFamilies } from "@startup/design-tokens";
import { useDriverLocationDraft } from "../locationDraft";

type Point = { latitude: number; longitude: number };
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
function validPoint(latitude: unknown, longitude: unknown): Point | null {
  if (latitude == null || longitude == null || latitude === "" || longitude === "") return null;
  const lat = Number(latitude), lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? { latitude: lat, longitude: lng } : null;
}

export default function DriverLocationScreen() {
  const params = useLocalSearchParams<{ latitude?: string; longitude?: string }>();
  const initialPoint = useMemo(() => validPoint(first(params.latitude), first(params.longitude)), [params.latitude, params.longitude]);
  const [point, setPoint] = useState<Point | null>(initialPoint);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<"search" | "gps" | null>(null);
  const [resolving, setResolving] = useState(false);
  const [lookupVersion, setLookupVersion] = useState(0);
  const [details, setDetails] = useState({ street: "", locality: "", city: "", state: "", pincode: "" });
  const googleRef = useRef<GoogleMaps.MapView>(null);
  const appleRef = useRef<AppleMaps.MapView>(null);
  const mounted = useRef(true);
  const mapTouched = useRef(false);
  const { showToast } = useToast();
  const choose = useDriverLocationDraft(state => state.choose);
  const nativeMaps = useMemo(() => {
    if (Platform.OS === "web" || Constants.appOwnership === "expo") return null;
    if (Platform.OS === "android" && Constants.expoConfig?.extra?.googleMapsConfigured !== true) return null;
    try { return require("expo-maps") as typeof import("expo-maps"); } catch { return null; }
  }, []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  function moveTo(next: Point) {
    setPoint(next);
    setLookupVersion(version => version + 1);
    const camera = { coordinates: next, zoom: 16 };
    if (Platform.OS === "android") googleRef.current?.setCameraPosition(camera);
    if (Platform.OS === "ios") appleRef.current?.setCameraPosition(camera);
  }
  async function findLocation(kind: "gps" | "search") {
    if (busy) return;
    if (kind === "search" && !search.trim()) {
      showToast({ title: "Enter an area or clinic address", type: "info" }); return;
    }
    Keyboard.dismiss();
    setBusy(kind);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!mounted.current) return;
      if (!permission.granted) throw new Error("Allow location access in device settings, or select your clinic directly on the map.");
      const result = kind === "gps"
        ? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })).coords
        : (await Location.geocodeAsync(search.trim()))[0];
      if (!mounted.current) return;
      const next = validPoint(result?.latitude, result?.longitude);
      if (!next) throw new Error("No location found. Try a more complete address or choose the clinic on the map.");
      moveTo(next);
    } catch (cause) {
      if (mounted.current) showToast({ title: "Could not find location", message: cause instanceof Error ? cause.message : "Try again.", type: "error" });
    } finally { if (mounted.current) setBusy(null); }
  }
  useEffect(() => { if (!initialPoint) void findLocation("gps"); }, []);

  useEffect(() => {
    if (!point) return;
    let active = true;
    setResolving(true);
    setDetails({ street: "", locality: "", city: "", state: "", pincode: "" });
    const timer = setTimeout(() => {
      void Location.reverseGeocodeAsync(point).then(([address]) => {
        if (!active) return;
        if (!address) throw new Error("Address lookup returned no result.");
        setDetails({
          street: [address?.name, address?.street].filter(Boolean).join(", "),
          locality: address?.district || address?.subregion || "",
          city: address?.city || "", state: address?.region || "",
          pincode: address?.postalCode?.replace(/\D/g, "").slice(0, 6) || "",
        });
      }).catch(() => {
        if (active) showToast({ title: "Enter the address after selecting the pin", message: "Address lookup is unavailable. The selected coordinates can still be used.", type: "info" });
      }).finally(() => { if (active) setResolving(false); });
    }, 600);
    return () => { active = false; clearTimeout(timer); };
  }, [point?.latitude, point?.longitude, lookupVersion]);

  function onMapPoint(coordinates: { latitude?: number; longitude?: number }, recenter = false) {
    const next = validPoint(coordinates.latitude, coordinates.longitude);
    if (!next) return;
    if (!recenter && !point && !mapTouched.current) return;
    if (recenter) moveTo(next);
    else setPoint(current => current && Math.abs(current.latitude - next.latitude) < 0.000001
      && Math.abs(current.longitude - next.longitude) < 0.000001 ? current : next);
  }
  const camera = useMemo(() => initialPoint ? { coordinates: initialPoint, zoom: 16 } : undefined, [initialPoint]);
  return (
    <View style={styles.screen}>
      <Header title="Choose Location" app="driver" onBackPress={() => router.back()} />
      <SafeAreaView edges={["bottom"]} style={styles.body}>
        <View style={styles.searchRow}>
          <Input accessibilityLabel="Search area or address" placeholder="Search an area or address"
            value={search} onChangeText={setSearch} returnKeyType="search" onSubmitEditing={() => void findLocation("search")}
            containerStyle={styles.searchInput} />
          <Button theme="driver" label="Search" loading={busy === "search"} disabled={busy !== null}
            onPress={() => void findLocation("search")} style={styles.searchButton} />
        </View>
        <Text style={styles.hint}>Drag the map under the pin or tap your address.</Text>
        <View style={styles.mapFrame} onTouchStart={() => { mapTouched.current = true; }}>
          {nativeMaps && Platform.OS === "android" ? <nativeMaps.GoogleMaps.View ref={googleRef} style={styles.map}
            cameraPosition={camera} onCameraMove={event => onMapPoint(event.coordinates)}
            onMapClick={event => onMapPoint(event.coordinates, true)} /> : null}
          {nativeMaps && Platform.OS === "ios" ? <nativeMaps.AppleMaps.View ref={appleRef} style={styles.map}
            cameraPosition={camera} onCameraMove={event => onMapPoint(event.coordinates)}
            onMapClick={event => onMapPoint(event.coordinates, true)} /> : null}
          {nativeMaps ? <View pointerEvents="none" style={styles.pin}><MapPin size={36} fill={colors.white} color={colors.driver.primary} /></View>
            : <View style={styles.unavailable}><Text style={styles.unavailableText}>Map selection needs Google Maps configuration. You can still use your current location or search, then confirm below.</Text></View>}
        </View>
        <View style={styles.bottom}>
          <Button theme="driver" variant="outline" label="Use current location" loading={busy === "gps"}
            disabled={busy !== null} onPress={() => void findLocation("gps")} />
          {resolving ? <Loader theme="driver" /> : <Text numberOfLines={2} style={styles.address}>
            {Object.values(details).filter(Boolean).join(", ") || (point ? "Selected location — enter address details after confirming." : "Select your location.")}
          </Text>}
          <Button theme="driver" label="Confirm Location" disabled={!point || resolving || busy !== null}
            onPress={() => { if (!point) return; choose({ ...point, ...details }); router.back(); }} />
        </View>
      </SafeAreaView>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white }, body: { flex: 1 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16 },
  searchInput: { flex: 1 }, searchButton: { minHeight: 44 },
  hint: { fontFamily: fontFamilies.regular, fontSize: 13, color: colors.textSecondary, paddingHorizontal: 16, paddingBottom: 12 },
  mapFrame: { flex: 1, minHeight: 200 }, map: { flex: 1 },
  pin: { position: "absolute", top: "50%", left: "50%", marginLeft: -18, marginTop: -36 },
  unavailable: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  unavailableText: { fontFamily: fontFamilies.regular, textAlign: "center", color: colors.textSecondary },
  bottom: { padding: 16, gap: 12 }, address: { fontFamily: fontFamilies.regular, fontSize: 14, color: colors.textPrimary },
});
