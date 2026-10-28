import type { SortBy } from "../types/doctor-results";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listMyPatientLocations,
  searchPublicPractices,
} from "@startup/data-access";
import type { PublicPractice } from "@startup/contracts";
import type { SavedPatientLocation } from "@startup/contracts";
import { useToast, useToastFeedback } from "@startup/mobile-ui";
import {
  resolveDoctorSearch,
  uniqueDoctorPractices,
} from "../utils/doctorSearch";
import type { DoctorResultsScreenProps } from "../types/doctor-results";
import { supabase, useMobileSession } from "../../../services/supabase";

export function useDoctorResults({
  symptom,
  consultationType,
  onBackPress,
}: DoctorResultsScreenProps) {
  const { showToast } = useToast();
  const client = useQueryClient();
  const { profile } = useMobileSession();
  const isOnline = consultationType === "Online";
  const [filter, setFilter] = useState<SortBy>(
    isOnline ? "rating" : "distance"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    isOnline ? "desc" : "asc"
  );
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [onlineOffset, setOnlineOffset] = useState(0);
  const [onlineRows, setOnlineRows] = useState<PublicPractice[]>([]);
  const locationRequested = useRef(false);
  const savedLocations = useQuery({
    queryKey: ["my-patient-locations", profile?.patient_id],
    queryFn: () => listMyPatientLocations(supabase!),
    enabled: Boolean(supabase && profile?.patient_id && !isOnline),
  });
  const selectedLocation = savedLocations.data?.find(
    (item: SavedPatientLocation) => item.selected
  );
  const query = useQuery({
    queryKey: [
      "public-practices",
      symptom,
      consultationType,
      isOnline ? null : coordinates,
    ],
    queryFn: () =>
      searchPublicPractices(supabase!, {
        ...resolveDoctorSearch(symptom),
        serviceMode: consultationType === "Home Visit" ? "home" : "clinic",
        latitude: isOnline ? undefined : coordinates?.latitude,
        longitude: isOnline ? undefined : coordinates?.longitude,
        limit: 50,
      }),
    enabled: Boolean(supabase) && !isOnline,
  });
  const onlineQuery = useQuery({
    queryKey: ["public-online-practices", symptom, onlineOffset],
    queryFn: () =>
      searchPublicPractices(supabase!, {
        ...resolveDoctorSearch(symptom),
        serviceMode: "online",
        offset: onlineOffset,
        limit: 50,
      }),
    enabled: Boolean(supabase) && isOnline,
  });
  useEffect(() => {
    setOnlineOffset(0);
    setOnlineRows([]);
  }, [symptom, consultationType]);
  useEffect(() => {
    if (!isOnline || !onlineQuery.data) return;
    setOnlineRows((previous) => {
      if (onlineOffset === 0) return onlineQuery.data;
      const merged = new Map(previous.map((item) => [item.practice_id, item]));
      for (const item of onlineQuery.data) merged.set(item.practice_id, item);
      return [...merged.values()];
    });
  }, [isOnline, onlineOffset, onlineQuery.data]);
  const isLoading = isOnline ? onlineQuery.isLoading : query.isLoading;
  const isError = isOnline ? onlineQuery.isError : query.isError;
  const rows = isOnline ? onlineRows : (query.data ?? []);
  useToastFeedback({
    error:
      locationError ||
      (isError ? "Could not search doctors. Pull down to retry." : ""),
  });
  useFocusEffect(
    useCallback(() => {
      if (isOnline) void onlineQuery.refetch();
      else void query.refetch();
    }, [isOnline, onlineQuery.refetch, query.refetch])
  );
  const practices = useMemo(
    () =>
      uniqueDoctorPractices(
        rows,
        consultationType === "Online"
          ? "online"
          : consultationType === "Home Visit"
            ? "home"
            : "clinic"
      ).sort((a, b) => {
        if (
          filter === "fee" &&
          (a.fee_minor === null || b.fee_minor === null)
        ) {
          return a.fee_minor === b.fee_minor
            ? 0
            : a.fee_minor === null
              ? 1
              : -1;
        }
        const difference =
          filter === "fee"
            ? Number(a.fee_minor) - Number(b.fee_minor)
            : filter === "rating"
              ? Number(a.rating ?? -1) - Number(b.rating ?? -1)
              : filter === "experience"
                ? a.experience_years - b.experience_years
                : (a.distance_meters ?? Number.MAX_SAFE_INTEGER) -
                  (b.distance_meters ?? Number.MAX_SAFE_INTEGER);
        return sortOrder === "asc" ? difference : -difference;
      }),
    [rows, filter, sortOrder, consultationType]
  );

  const requestLocation = useCallback(async () => {
    setLocating(true);
    setLocationError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationError(
          "Location is off. You can still browse doctors by fee or experience."
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoordinates({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch {
      setLocationError(
        "Could not get your location. You can still browse doctors."
      );
    } finally {
      setLocating(false);
    }
  }, []);
  useEffect(() => {
    if (isOnline) return;
    if (savedLocations.isLoading) return;
    if (
      selectedLocation?.latitude != null &&
      selectedLocation.longitude != null
    ) {
      setCoordinates({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      });
      return;
    }
    if (locationRequested.current) return;
    locationRequested.current = true;
    void requestLocation();
  }, [
    isOnline,
    requestLocation,
    savedLocations.isLoading,
    selectedLocation?.latitude,
    selectedLocation?.longitude,
  ]);

  const toggleSortOrder = () => {
    const nextOrder = sortOrder === "asc" ? "desc" : "asc";
    setSortOrder(nextOrder);
    const label =
      filter === "distance"
        ? "distance"
        : filter === "experience"
          ? "experience"
          : filter === "rating"
            ? "rating"
            : "consultation fee";
    showToast({
      title: `Sorting in ${nextOrder === "asc" ? "ascending" : "descending"} order`,
      message: `Doctors are sorted by ${label}.`,
      type: "info",
    });
  };

  return {
    refresh: async () => {
      if (!isOnline) return query.refetch({ throwOnError: true });
      const firstPage = await client.fetchQuery({
        queryKey: ["public-online-practices", symptom, 0],
        queryFn: () =>
          searchPublicPractices(supabase!, {
            ...resolveDoctorSearch(symptom),
            serviceMode: "online",
            offset: 0,
            limit: 50,
          }),
        staleTime: 0,
      });
      setOnlineOffset(0);
      setOnlineRows(firstPage);
    },
    isOnline,
    filter,
    setFilter,
    sortOrder,
    setSortOrder,
    coordinates,
    locating,
    setOnlineOffset,
    onlineQuery,
    isLoading,
    isError,
    practices,
    requestLocation,
    toggleSortOrder,
  };
}
