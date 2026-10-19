"use client";
import { centerOf } from "../utils/mapCoordinates";
import { loadMaps } from "../services/googleMaps";
import type { FacilityLocationMapProps } from "../types/facilityLocationMap";
import type {
  FacilityMapPoint,
  SearchPlace,
  MapInstance,
} from "../types/facilityLocationMap";
import { useEffect, useRef, useState } from "react";
export function useFacilityLocationMap({
  apiKey,
  selected,
  getCurrentLocation,
  onConfirm,
  onUnavailable,
  disabled = false,
}: FacilityLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const initialSelected = useRef(selected);
  const [draft, setDraft] = useState<FacilityMapPoint | null>(selected);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [mapError, setMapError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchPlace[]>([]);

  useEffect(() => {
    let active = true;
    let listeners: Array<{ remove: () => void }> = [];
    void loadMaps(apiKey)
      .then((maps) => {
        if (!active || !containerRef.current) return;
        const startingPoint = initialSelected.current;
        const map = new maps.Map(containerRef.current, {
          center: startingPoint
            ? { lat: startingPoint.latitude, lng: startingPoint.longitude }
            : { lat: 20.5937, lng: 78.9629 },
          zoom: startingPoint ? 17 : 5,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: "cooperative",
        });
        mapRef.current = map;
        listeners = [
          map.addListener("dragend", () => setDraft(centerOf(map))),
          map.addListener("click", (event) => {
            if (!event?.latLng) return;
            const point = { lat: event.latLng.lat(), lng: event.latLng.lng() };
            map.setCenter(point);
            setDraft({ latitude: point.lat, longitude: point.lng });
          }),
        ];
        setLoading(false);
      })
      .catch((cause) => {
        if (!active) return;
        setMapError(
          cause instanceof Error ? cause.message : "The map could not load."
        );
        onUnavailable(true);
        setLoading(false);
      });
    return () => {
      active = false;
      listeners.forEach((listener) => listener.remove());
      mapRef.current = null;
    };
  }, [apiKey, onUnavailable]);

  useEffect(() => {
    if (!selected || !mapRef.current) return;
    mapRef.current.setCenter({
      lat: selected.latitude,
      lng: selected.longitude,
    });
    mapRef.current.setZoom(17);
    setDraft(selected);
  }, [selected]);

  async function useCurrentLocation() {
    setLocationError("");
    setLocating(true);
    try {
      const point = await getCurrentLocation();
      mapRef.current?.setCenter({ lat: point.latitude, lng: point.longitude });
      mapRef.current?.setZoom(17);
      setDraft(point);
    } catch (cause) {
      setLocationError(
        cause instanceof Error ? cause.message : "Could not get your location."
      );
    } finally {
      setLocating(false);
    }
  }

  async function searchAddress() {
    if (
      disabled ||
      loading ||
      mapError ||
      searching ||
      search.trim().length < 2
    )
      return;
    setSearching(true);
    setLocationError("");
    setSearchResults([]);
    try {
      const response = await fetch("/api/facility-address/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: search.trim() }),
      });
      const result = (await response.json()) as {
        places?: SearchPlace[];
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error ?? "Address search failed.");
      setSearchResults(result.places ?? []);
      if (!result.places?.length)
        setLocationError(
          "No matching address found. Try a more complete address or move the map."
        );
    } catch (cause) {
      setLocationError(
        cause instanceof Error ? cause.message : "Address search failed."
      );
    } finally {
      setSearching(false);
    }
  }

  function chooseSearchResult(place: SearchPlace) {
    mapRef.current?.setCenter({ lat: place.latitude, lng: place.longitude });
    mapRef.current?.setZoom(17);
    setDraft({ latitude: place.latitude, longitude: place.longitude });
    setSearchResults([]);
    setSearch(place.address);
    setLocationError("");
  }

  async function confirmPin() {
    if (!draft) return;
    setConfirming(true);
    try {
      await onConfirm(draft);
    } finally {
      setConfirming(false);
    }
  }

  return {
    containerRef,
    draft,
    loading,
    locating,
    confirming,
    mapError,
    locationError,
    search,
    setSearch,
    searching,
    searchResults,
    setSearchResults,
    useCurrentLocation,
    searchAddress,
    chooseSearchResult,
    confirmPin,
  };
}
