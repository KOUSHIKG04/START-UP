import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Platform } from "react-native";
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
import { useToast } from "@startup/mobile-ui";
import { useLocationDraft } from "../stores/savedLocationDraft";
import { resolveDriverAddress } from "../services/resolveAddress";
import type { Point, PlaceDetails } from "../types/map-picker";
import { first, validPoint } from "../utils/mapPicker";
import { emptyDetails } from "../utils/mapPickerConstants";

export function useSavedLocationPicker() {
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
      const result = mapPlaceSchema.safeParse(
        JSON.parse(first(params.place) ?? "null")
      );
      return result.success &&
        initialPoint &&
        result.data.latitude === initialPoint.latitude &&
        result.data.longitude === initialPoint.longitude
        ? result.data
        : null;
    } catch {
      return null;
    }
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
    if (pointRef.current)
      googleMapRef.current?.setCameraPosition({
        coordinates: pointRef.current,
        zoom: 16,
        duration: 0,
      });
  }, []);

  function moveCamera(next: Point) {
    mapTouched.current = false;
    const camera = { coordinates: next, zoom: 16 };
    if (Platform.OS === "android")
      googleMapRef.current?.setCameraPosition({ ...camera, duration: 0 });
    if (Platform.OS === "ios") appleMapRef.current?.setCameraPosition(camera);
  }
  function chooseSearchResult(result: MapPlace) {
    operation.current += 1;
    selectedPlace.current = result;
    const next = { latitude: result.latitude, longitude: result.longitude };
    pointRef.current = next;
    setPoint(next);
    setSearchResults([]);
    setSearching(false);
    setLocating(false);
    setLookupVersion((version) => version + 1);
    Keyboard.dismiss();
    moveCamera(next);
  }
  async function searchAddress() {
    if (searching) return;
    if (search.trim().length < 2) {
      showToast({ title: "Enter an area or address", type: "info" });
      return;
    }
    const request = ++operation.current;
    Keyboard.dismiss();
    setSearching(true);
    setLocating(false);
    setSearchResults([]);
    try {
      if (supabase) {
        const results = await searchMapPlaces(supabase, {
          query: search.trim(),
          ...(pointRef.current ?? {}),
        });
        if (!mounted.current || request !== operation.current) return;
        if (results.configured) {
          setSearchResults(results.places);
          if (!results.places.length)
            showToast({
              title: "No places found",
              message: "Try the locality, city or a more complete address.",
              type: "info",
            });
          return;
        }
      }
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted)
        throw new Error(
          "Allow location access for device search, or choose a point on the map."
        );
      const [found] = await Location.geocodeAsync(search.trim());
      if (!mounted.current || request !== operation.current) return;
      const next = validPoint(found?.latitude, found?.longitude);
      if (!next)
        throw new Error("No location found. Try a more complete address.");
      selectedPlace.current = null;
      pointRef.current = next;
      setPoint(next);
      setLookupVersion((version) => version + 1);
      moveCamera(next);
    } catch (cause) {
      if (mounted.current && request === operation.current)
        showToast({
          title: "Could not find address",
          message: cause instanceof Error ? cause.message : "Try again.",
          type: "error",
        });
    } finally {
      if (mounted.current && request === operation.current) setSearching(false);
    }
  }
  async function useDeviceLocation() {
    if (locating || searching) return;
    const request = ++operation.current;
    setLocating(true);
    setSearchResults([]);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted)
        throw new Error("Allow location access or search for an address.");
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new Error(
                  "Location is taking too long. Search for an address or try outside."
                )
              ),
            15000
          );
        }),
      ]);
      if (!mounted.current || request !== operation.current) return;
      const next = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      selectedPlace.current = null;
      pointRef.current = next;
      setDetails(emptyDetails);
      setAddressLabel("");
      setPoint(next);
      setLookupVersion((version) => version + 1);
      moveCamera(next);
    } catch (cause) {
      if (mounted.current && request === operation.current)
        showToast({
          title: "Could not find your location",
          message: cause instanceof Error ? cause.message : "Try again.",
          type: "error",
        });
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
    if (
      found &&
      found.latitude === point.latitude &&
      found.longitude === point.longitude
    ) {
      setDetails({
        street: found.street,
        locality: found.locality,
        city: found.city,
        state: found.state,
        pincode: found.pincode,
      });
      setAddressLabel(found.address);
      setResolving(false);
      return;
    }
    let active = true;
    setResolving(true);
    setDetails(emptyDetails);
    setAddressLabel("");
    const timer = setTimeout(() => {
      void resolveDriverAddress(point, () => active)
        .then((address) => {
          if (!active) return;
          setAddressLabel(address.address);
          setDetails({
            street: address.street,
            locality: address.locality,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
          });
        })
        .catch((cause: unknown) => {
          if (active) {
            setDetails(emptyDetails);
            setAddressLabel("");
            showToast({
              title: "Could not fill this address",
              message:
                cause instanceof Error
                  ? cause.message
                  : "Retry the lookup or enter the address manually.",
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

  const onMapPoint = useCallback(
    (
      coordinates: { latitude?: number; longitude?: number },
      recenter = false
    ) => {
      const next = validPoint(coordinates.latitude, coordinates.longitude);
      if (!next) return;
      const previous = pointRef.current;
      if (
        previous &&
        Math.abs(next.latitude - previous.latitude) < 0.00001 &&
        Math.abs(next.longitude - previous.longitude) < 0.00001
      )
        return;
      operation.current += 1;
      selectedPlace.current = null;
      pointRef.current = next;
      setSearching(false);
      setLocating(false);
      setSearchResults([]);
      setDetails(emptyDetails);
      setAddressLabel("");
      setPoint(next);
      if (recenter) {
        mapTouched.current = false;
        const camera = { coordinates: next, zoom: 16 };
        if (Platform.OS === "android")
          googleMapRef.current?.setCameraPosition({ ...camera, duration: 0 });
        if (Platform.OS === "ios")
          appleMapRef.current?.setCameraPosition(camera);
      }
    },
    []
  );
  const onCameraMove = useCallback(
    (event: { coordinates: { latitude?: number; longitude?: number } }) => {
      if (mapTouched.current) onMapPoint(event.coordinates);
    },
    [onMapPoint]
  );
  const onMapClick = useCallback(
    (event: { coordinates: { latitude?: number; longitude?: number } }) =>
      onMapPoint(event.coordinates, true),
    [onMapPoint]
  );

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

  return {
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
  };
}
