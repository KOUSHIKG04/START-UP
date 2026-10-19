"use client";
import { useFacilityLocationMap } from "../hooks/useFacilityLocationMap";

import type { FacilityLocationMapProps } from "../types/facilityLocationMap";

import { LocateFixed, MapPin } from "lucide-react";
import { Button } from "@startup/web-ui/components/ui/button";
import { Input } from "@startup/web-ui/components/ui/input";

export function FacilityLocationMap({
  apiKey,
  selected,
  getCurrentLocation,
  onConfirm,
  onUnavailable,
  disabled = false,
}: FacilityLocationMapProps) {
  const {
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
  } = useFacilityLocationMap({
    apiKey,
    selected,
    getCurrentLocation,
    onConfirm,
    onUnavailable,
    disabled,
  });
  return (
    <section className="space-y-3" aria-label="Facility map location">
      <div>
        <h3 className="text-sm font-medium">Pin the facility on the map</h3>
        <p className="text-muted-foreground text-sm">
          Search an address, use your location, or move the map. Confirm the pin
          at the facility entrance.
        </p>
      </div>
      <div className="flex gap-2">
        <Input
          aria-label="Search for a facility address"
          placeholder="Search area or street address"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setSearchResults([]);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void searchAddress();
            }
          }}
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={searchAddress}
          disabled={
            disabled ||
            loading ||
            !!mapError ||
            searching ||
            search.trim().length < 2
          }
        >
          {searching ? "Searching…" : "Search"}
        </Button>
      </div>
      {searchResults.length > 0 && (
        <div
          className="divide-y rounded-lg border"
          aria-label="Address search results"
        >
          {searchResults.map((place, index) => (
            <button
              key={`${place.latitude}-${place.longitude}-${index}`}
              type="button"
              className="hover:bg-muted focus-visible:bg-muted block w-full px-3 py-3 text-left text-sm focus-visible:outline-none"
              onClick={() => chooseSearchResult(place)}
            >
              {place.address}
            </button>
          ))}
          <p className="text-muted-foreground px-3 py-2 text-xs">Google Maps</p>
        </div>
      )}
      <div className="bg-muted relative h-72 overflow-hidden rounded-lg border sm:h-80">
        <div
          ref={containerRef}
          className="h-full w-full"
          aria-label="Map for selecting the facility location"
        />
        {!loading && !mapError && (
          <MapPin
            className="text-primary pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full drop-shadow-md"
            size={38}
            fill="white"
            aria-hidden="true"
          />
        )}
        {(loading || mapError) && (
          <div className="bg-muted text-muted-foreground absolute inset-0 flex items-center justify-center p-6 text-center text-sm">
            {loading ? "Loading map…" : mapError}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={useCurrentLocation}
          disabled={disabled || loading || !!mapError || locating || confirming}
        >
          <LocateFixed aria-hidden="true" />{" "}
          {locating ? "Finding location…" : "Use current location"}
        </Button>
        <Button
          type="button"
          onClick={confirmPin}
          disabled={
            disabled ||
            !draft ||
            loading ||
            !!mapError ||
            locating ||
            confirming
          }
        >
          {confirming ? "Finding address…" : "Confirm this pin"}
        </Button>
      </div>
      {draft && (
        <p className="text-muted-foreground text-xs" role="status">
          Selected point: {draft.latitude.toFixed(5)},{" "}
          {draft.longitude.toFixed(5)}
          {selected?.latitude === draft.latitude &&
          selected?.longitude === draft.longitude
            ? " · Confirmed"
            : " · Confirm the pin to use it"}
        </p>
      )}
      {locationError && (
        <p role="alert" className="text-destructive text-sm">
          {locationError}
        </p>
      )}
    </section>
  );
}
