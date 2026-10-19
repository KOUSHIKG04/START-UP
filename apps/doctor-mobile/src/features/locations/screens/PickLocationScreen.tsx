import { useMapPicker } from "../hooks/useMapPicker";

export type { Point, PlaceDetails } from "../types/pick-location-screen";
import { StatusBar } from "expo-status-bar";

import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { LocateFixed, MapPin } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { Button, Header, Input } from "@startup/mobile-ui";

export default function PickLocationScreen() {
  const {
    insets,
    point,
    searchResults,
    setSearchResults,
    locating,
    search,
    setSearch,
    searching,
    resolving,
    mapTouched,
    googleMapRef,
    appleMapRef,
    nativeMaps,
    onMapLoaded,
    chooseSearchResult,
    searchAddress,
    useDeviceLocation,
    onCameraMove,
    onMapClick,
    confirm,
    placeLabel,
    cameraPosition,
  } = useMapPicker();
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Header
        title="Choose Location"
        app="doctor"
        onBackPress={() => router.back()}
      />
      <View style={styles.body}>
        <View
          style={styles.mapFrame}
          onTouchStart={() => {
            mapTouched.current = true;
          }}
        >
          {nativeMaps && Platform.OS === "android" ? (
            <nativeMaps.GoogleMaps.View
              ref={googleMapRef}
              style={styles.map}
              cameraPosition={cameraPosition}
              onMapLoaded={onMapLoaded}
              onCameraMove={onCameraMove}
              onMapClick={onMapClick}
            />
          ) : null}
          {nativeMaps && Platform.OS === "ios" ? (
            <nativeMaps.AppleMaps.View
              ref={appleMapRef}
              style={styles.map}
              cameraPosition={cameraPosition}
              onCameraMove={onCameraMove}
              onMapClick={onMapClick}
            />
          ) : null}
          {nativeMaps ? (
            <View pointerEvents="none" style={styles.pin}>
              <MapPin
                size={36}
                fill={colors.white}
                color={colors.doctor.primary}
              />
            </View>
          ) : (
            <View style={styles.mapState}>
              <Text style={styles.stateText}>
                Map selection is unavailable in this build. You can search for a
                place or use your current location.
              </Text>
            </View>
          )}
        </View>
        <View style={styles.searchOverlay}>
          <View style={styles.searchRow}>
            <Input
              accessibilityLabel="Search area or address"
              placeholder="Search an area or address"
              value={search}
              onChangeText={(value) => {
                setSearch(value);
                setSearchResults([]);
              }}
              returnKeyType="search"
              containerStyle={styles.searchInput}
              onSubmitEditing={() => void searchAddress()}
            />
            <Button
              theme="doctor"
              label="Search"
              loading={searching}
              disabled={searching}
              onPress={() => void searchAddress()}
            />
          </View>
          {searchResults.length ? (
            <View style={styles.results}>
              {searchResults.map((result) => (
                <Pressable
                  key={result.id}
                  accessibilityRole="button"
                  onPress={() => chooseSearchResult(result)}
                  style={styles.resultRow}
                >
                  <MapPin size={18} color={colors.doctor.primary} />
                  <View style={styles.resultCopy}>
                    <Text numberOfLines={1} style={styles.resultName}>
                      {result.name}
                    </Text>
                    <Text numberOfLines={2} style={styles.resultAddress}>
                      {result.address}
                    </Text>
                  </View>
                </Pressable>
              ))}
              <Text style={styles.googleAttribution}>Google Maps</Text>
              {searchResults
                .flatMap((p) => p.attributions)
                .map((a, i) => (
                  <Text
                    key={`${a.provider}-${i}`}
                    style={styles.googleAttribution}
                  >
                    {a.provider}
                  </Text>
                ))}
            </View>
          ) : null}
        </View>
        <View
          style={[
            styles.bottom,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <Button
            theme="doctor"
            variant="outline"
            label="Use Current Location"
            loading={locating}
            disabled={locating || searching}
            leftIcon={<LocateFixed size={19} color={colors.doctor.primary} />}
            onPress={() => void useDeviceLocation()}
          />
          {point ? (
            <View style={styles.place}>
              <MapPin size={20} color={colors.doctor.primary} />
              <Text style={styles.placeTitle} numberOfLines={2}>
                {placeLabel || "Selected map point"}
              </Text>
            </View>
          ) : null}
          <Button
            theme="doctor"
            label="Confirm Location"
            loading={resolving}
            disabled={!point || locating || searching || resolving}
            onPress={confirm}
            style={styles.confirm}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  body: { flex: 1 },
  searchOverlay: { position: "absolute", top: 16, left: 16, right: 16, gap: 8 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, minWidth: 0 },
  results: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  resultCopy: { flex: 1 },
  resultName: {
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    color: colors.textPrimary,
  },
  resultAddress: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  googleAttribution: {
    fontFamily: fontFamilies.regular,
    color: "#5E5E5E",
    fontSize: 12,
  },
  pin: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -18,
    marginTop: -36,
  },
  instruction: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    color: colors.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
  },
  mapFrame: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.doctor.surface,
  },
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
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
