import { useEffect, useRef } from "react";
import Constants from "expo-constants";
import { Image, Platform, type ImageStyle } from "react-native";
import type { AppleMaps as AppleMapsType, GoogleMaps as GoogleMapsType } from "expo-maps";
import type { ActiveAmbulanceTracking } from "@startup/contracts";
import { trackingMapImage } from "../utils/ambulanceConstants";

type Props = {
  location: ActiveAmbulanceTracking | null;
  style: ImageStyle;
};

export function DriverTrackingMap({ location, style }: Props) {
  const googleMapRef = useRef<GoogleMapsType.MapView>(null);
  const appleMapRef = useRef<AppleMapsType.MapView>(null);
  const coordinates = location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
    && Math.abs(location.latitude) <= 90 && Math.abs(location.longitude) <= 180
    ? { latitude: location.latitude, longitude: location.longitude }
    : null;
  const isExpoGo = Constants.appOwnership === "expo";
  const canShowNativeMap = coordinates && !isExpoGo && (
    Platform.OS === "ios" || (Platform.OS === "android" && Constants.expoConfig?.extra?.googleMapsConfigured === true)
  );

  const latitude = coordinates?.latitude;
  const longitude = coordinates?.longitude;
  useEffect(() => {
    if (!canShowNativeMap || latitude === undefined || longitude === undefined) return;
    const cameraPosition = { coordinates: { latitude, longitude }, zoom: 15 };
    if (Platform.OS === "android") googleMapRef.current?.setCameraPosition(cameraPosition);
    if (Platform.OS === "ios") appleMapRef.current?.setCameraPosition(cameraPosition);
  }, [canShowNativeMap, latitude, longitude]);

  if (canShowNativeMap) {
    // The native module is deliberately loaded only in a development or release build.
    // Expo Go does not include expo-maps, so importing it at module scope would break the screen.
    // An older installed development build can also lack the native module after a JS update.
    try {
      const { AppleMaps, GoogleMaps } = require("expo-maps") as typeof import("expo-maps");
      const cameraPosition = { coordinates, zoom: 15 };
      const markers = [{ id: "driver", coordinates, title: "Ambulance driver" }];
      if (Platform.OS === "android") {
        return <GoogleMaps.View ref={googleMapRef} style={style} cameraPosition={cameraPosition} markers={markers} />;
      }
      return <AppleMaps.View ref={appleMapRef} style={style} cameraPosition={cameraPosition} markers={markers} />;
    } catch {
      // Preserve tracking UI when the installed binary predates expo-maps.
    }
  }

  return (
    <Image
      source={trackingMapImage}
      resizeMode="cover"
      style={style}
      accessibilityLabel="Illustrative map preview; live map unavailable"
    />
  );
}
