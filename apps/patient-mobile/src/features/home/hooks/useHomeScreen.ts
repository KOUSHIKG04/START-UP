import type { HomeScreenProps } from "../types/home-screen";
import { ALL_SPECIALITIES } from "../utils/homeConstants";
import { useTimeGreeting } from "@startup/mobile-ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, BackHandler, Keyboard, TextInput } from "react-native";
import * as Location from "expo-location";
import { router, type Href } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listClinicAppointments,
  listMyPatientLocations,
  saveMyPatientLocation,
} from "@startup/data-access";
import type { SavedPatientLocation } from "@startup/contracts";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTypewriterPlaceholder } from "../../../hooks/useTypewriterPlaceholder";
import { supabase, useMobileSession } from "../../../services/supabase";
import { formatSavedLocation } from "../../locations/utils/locationDisplay";
import { canGeocodeAddress } from "../../locations/services/geocoding";
import {
  COLLAPSE_DISTANCE,
  getHeaderAnimationStyles,
} from "../../../utils/headerConstants";

export function useHomeScreen({ onNotificationPress }: HomeScreenProps = {}) {
  useEffect(() => {
    router.prefetch("/select-location");
  }, []);
  const greeting = useTimeGreeting();
  const { top: topInset } = useSafeAreaInsets();
  const { profile } = useMobileSession();
  const queryClient = useQueryClient();
  const geocodedLocation = useRef<string | null>(null);
  const savedLocations = useQuery({
    queryKey: ["my-patient-locations", profile?.patient_id],
    queryFn: () => listMyPatientLocations(supabase!),
    enabled: Boolean(supabase && profile?.patient_id),
  });
  const selectedLocation = savedLocations.data?.find(
    (item: SavedPatientLocation) => item.selected
  );
  useEffect(() => {
    if (
      !selectedLocation ||
      selectedLocation.latitude !== null ||
      geocodedLocation.current === selectedLocation.id ||
      !supabase
    )
      return;
    geocodedLocation.current = selectedLocation.id;
    void (async () => {
      try {
        if (!(await canGeocodeAddress())) return;
        const [point] = await Location.geocodeAsync(
          formatSavedLocation(selectedLocation)
        );
        if (!point) return;
        await saveMyPatientLocation(
          supabase,
          {
            label: selectedLocation.label,
            kind: selectedLocation.kind,
            building: selectedLocation.building || undefined,
            street: selectedLocation.street || undefined,
            locality: selectedLocation.locality || undefined,
            city: selectedLocation.city || undefined,
            state: selectedLocation.state || undefined,
            pincode: selectedLocation.pincode || undefined,
            instructions: selectedLocation.instructions || undefined,
            use_account_details: selectedLocation.use_account_details,
            receiver_name: selectedLocation.receiver_name || undefined,
            receiver_phone: selectedLocation.receiver_phone || undefined,
            latitude: point.latitude,
            longitude: point.longitude,
          },
          selectedLocation.id
        );
        await queryClient.invalidateQueries({
          queryKey: ["my-patient-locations"],
        });
      } catch {
        /* The address remains available to edit when geocoding fails. */
      }
    })();
  }, [selectedLocation, queryClient]);
  const scrollYRef = useRef<Animated.Value | null>(null);
  if (scrollYRef.current === null) {
    scrollYRef.current = new Animated.Value(0);
  }
  const scrollY = scrollYRef.current;
  const searchInputRef = useRef<TextInput>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchPlaceholder = useTypewriterPlaceholder();

  const appointments = useQuery({
    queryKey: ["patient-clinic-appointments"],
    queryFn: () => listClinicAppointments(supabase!),
    enabled: Boolean(supabase),
  });

  const upcoming = appointments.data
    ?.filter(
      (item) =>
        ["pending", "confirmed"].includes(item.status) &&
        new Date(item.ends_at).getTime() >= Date.now()
    )
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );

  const { collapsedHeight, expandedHeaderStyle, searchStyle } =
    getHeaderAnimationStyles(scrollY, topInset);

  const handleCloseSearch = useCallback(() => {
    Keyboard.dismiss();
    searchInputRef.current?.blur();

    setIsSearchActive(false);
    setSearchQuery("");

    if (scrollYRef.current) {
      Animated.timing(scrollYRef.current, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  }, []);

  const handleOpenSearch = () => {
    if (isSearchActive) return;
    setIsSearchActive(true);
    Animated.timing(scrollY, {
      toValue: COLLAPSE_DISTANCE,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  // Intercept Android hardware back press so hitting back navigation
  // returns to the home page instead of exiting the app
  useEffect(() => {
    if (!isSearchActive) return;

    const onBackPress = () => {
      handleCloseSearch();
      return true; // prevent exiting the app
    };

    const backHandlerSubscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );

    return () => backHandlerSubscription.remove();
  }, [isSearchActive, handleCloseSearch]);

  const handleSelectItem = (term: string) => {
    Keyboard.dismiss();
    router.push({
      pathname: "/doctor-results",
      params: { symptom: term, consultationType: "Clinic Visit" },
    } as unknown as Href);
  };

  // Live filtered results when user is typing
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const liveResults = trimmedQuery
    ? ALL_SPECIALITIES.filter((title) =>
        title.toLowerCase().includes(trimmedQuery)
      ).map((title) => ({ title, type: "Speciality" as const }))
    : [];

  // 4px below the collapsed search bar for search content
  const searchActivePaddingTop = topInset + 68 + 4;

  return {
    greeting,
    selectedLocation,
    scrollY,
    searchInputRef,
    isSearchActive,
    isNotificationOpen,
    setIsNotificationOpen,
    searchQuery,
    setSearchQuery,
    searchPlaceholder,
    appointments,
    upcoming,
    collapsedHeight,
    expandedHeaderStyle,
    searchStyle,
    handleCloseSearch,
    handleOpenSearch,
    handleSelectItem,
    trimmedQuery,
    liveResults,
    searchActivePaddingTop,
  };
}
