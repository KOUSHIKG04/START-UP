import { useSavedLocationPicker } from "../hooks/useSavedLocationPicker";
import { StatusBar } from "expo-status-bar";

import { Platform, Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { LocateFixed, MapPin } from "lucide-react-native";
import { colors } from "@startup/design-tokens";
import { Button, Header, Input } from "@startup/mobile-ui";

import { styles } from "../components/LocationPicker.styles";
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
  } = useSavedLocationPicker();
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Header
        title="Choose Location"
        app="driver"
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
                color={colors.driver.primary}
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
              theme="driver"
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
                  <MapPin size={18} color={colors.driver.primary} />
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
            theme="driver"
            variant="outline"
            label="Use Current Location"
            loading={locating}
            disabled={locating || searching}
            leftIcon={<LocateFixed size={19} color={colors.driver.primary} />}
            onPress={() => void useDeviceLocation()}
          />
          {point ? (
            <View style={styles.place}>
              <MapPin size={20} color={colors.driver.primary} />
              <Text style={styles.placeTitle} numberOfLines={2}>
                {placeLabel || "Selected map point"}
              </Text>
            </View>
          ) : null}
          <Button
            theme="driver"
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
