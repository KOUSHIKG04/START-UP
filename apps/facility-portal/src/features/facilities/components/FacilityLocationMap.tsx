"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import { Button } from "@startup/web-ui/components/ui/button";
import { Input } from "@startup/web-ui/components/ui/input";

export type FacilityMapPoint = { latitude: number; longitude: number };
type SearchPlace = FacilityMapPoint & { address: string };

type MapCenter = { lat: () => number; lng: () => number };
type MapInstance = {
  getCenter: () => MapCenter | undefined;
  setCenter: (point: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  addListener: (event: string, callback: (event?: { latLng?: MapCenter }) => void) => { remove: () => void };
};
type MapsNamespace = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => MapInstance;
};
type MapWindow = Window & {
  google?: { maps?: MapsNamespace };
  __clinzoFacilityMapReady?: () => void;
};

let mapsPromise: Promise<MapsNamespace> | null = null;

function loadMaps(apiKey: string): Promise<MapsNamespace> {
  const browser = window as MapWindow;
  if (browser.google?.maps?.Map) return Promise.resolve(browser.google.maps);
  if (mapsPromise) return mapsPromise;

  mapsPromise = new Promise<MapsNamespace>((resolve, reject) => {
    const script = document.createElement("script");
    const fail = () => {
      delete browser.__clinzoFacilityMapReady;
      script.remove();
      mapsPromise = null;
      reject(new Error("The map could not load. Check the Maps JavaScript API key and try again."));
    };
    browser.__clinzoFacilityMapReady = () => {
      delete browser.__clinzoFacilityMapReady;
      const maps = browser.google?.maps;
      if (maps?.Map) resolve(maps);
      else fail();
    };
    script.async = true;
    script.onerror = fail;
    const url = new URL("https://maps.googleapis.com/maps/api/js");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("loading", "async");
    url.searchParams.set("callback", "__clinzoFacilityMapReady");
    script.src = url.toString();
    document.head.append(script);
  });
  return mapsPromise;
}

function centerOf(map: MapInstance): FacilityMapPoint | null {
  const center = map.getCenter();
  return center ? { latitude: center.lat(), longitude: center.lng() } : null;
}

export function FacilityLocationMap({
  apiKey,
  selected,
  getCurrentLocation,
  onConfirm,
  onUnavailable,
  disabled = false,
}: {
  apiKey: string;
  selected: FacilityMapPoint | null;
  getCurrentLocation: () => Promise<FacilityMapPoint>;
  onConfirm: (point: FacilityMapPoint) => Promise<void>;
  onUnavailable: (unavailable: boolean) => void;
  disabled?: boolean;
}) {
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
    void loadMaps(apiKey).then(maps => {
      if (!active || !containerRef.current) return;
      const startingPoint = initialSelected.current;
      const map = new maps.Map(containerRef.current, {
        center: startingPoint ? { lat: startingPoint.latitude, lng: startingPoint.longitude } : { lat: 20.5937, lng: 78.9629 },
        zoom: startingPoint ? 17 : 5,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: "cooperative",
      });
      mapRef.current = map;
      listeners = [
        map.addListener("dragend", () => setDraft(centerOf(map))),
        map.addListener("click", event => {
          if (!event?.latLng) return;
          const point = { lat: event.latLng.lat(), lng: event.latLng.lng() };
          map.setCenter(point);
          setDraft({ latitude: point.lat, longitude: point.lng });
        }),
      ];
      setLoading(false);
    }).catch(cause => {
      if (!active) return;
      setMapError(cause instanceof Error ? cause.message : "The map could not load.");
      onUnavailable(true);
      setLoading(false);
    });
    return () => {
      active = false;
      listeners.forEach(listener => listener.remove());
      mapRef.current = null;
    };
  }, [apiKey, onUnavailable]);

  useEffect(() => {
    if (!selected || !mapRef.current) return;
    mapRef.current.setCenter({ lat: selected.latitude, lng: selected.longitude });
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
      setLocationError(cause instanceof Error ? cause.message : "Could not get your location.");
    } finally {
      setLocating(false);
    }
  }

  async function searchAddress() {
    if (disabled || loading || mapError || searching || search.trim().length < 2) return;
    setSearching(true);
    setLocationError("");
    setSearchResults([]);
    try {
      const response = await fetch("/api/facility-address/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: search.trim() }),
      });
      const result = await response.json() as { places?: SearchPlace[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Address search failed.");
      setSearchResults(result.places ?? []);
      if (!result.places?.length) setLocationError("No matching address found. Try a more complete address or move the map.");
    } catch (cause) {
      setLocationError(cause instanceof Error ? cause.message : "Address search failed.");
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

  return (
    <section className="space-y-3" aria-label="Facility map location">
      <div>
        <h3 className="text-sm font-medium">Pin the facility on the map</h3>
        <p className="text-sm text-muted-foreground">Search an address, use your location, or move the map. Confirm the pin at the facility entrance.</p>
      </div>
      <div className="flex gap-2">
        <Input aria-label="Search for a facility address" placeholder="Search area or street address" value={search} onChange={event => { setSearch(event.target.value); setSearchResults([]); }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void searchAddress(); } }} className="min-w-0 flex-1" />
        <Button type="button" variant="outline" onClick={searchAddress} disabled={disabled || loading || !!mapError || searching || search.trim().length < 2}>{searching ? "Searching…" : "Search"}</Button>
      </div>
      {searchResults.length > 0 && <div className="divide-y rounded-lg border" aria-label="Address search results">
        {searchResults.map((place, index) => <button key={`${place.latitude}-${place.longitude}-${index}`} type="button" className="block w-full px-3 py-3 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none" onClick={() => chooseSearchResult(place)}>{place.address}</button>)}
        <p className="px-3 py-2 text-xs text-muted-foreground">Google Maps</p>
      </div>}
      <div className="relative h-72 overflow-hidden rounded-lg border bg-muted sm:h-80">
        <div ref={containerRef} className="h-full w-full" aria-label="Map for selecting the facility location" />
        {!loading && !mapError && <MapPin className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full text-primary drop-shadow-md" size={38} fill="white" aria-hidden="true" />}
        {(loading || mapError) && <div className="absolute inset-0 flex items-center justify-center bg-muted p-6 text-center text-sm text-muted-foreground">{loading ? "Loading map…" : mapError}</div>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={useCurrentLocation} disabled={disabled || loading || !!mapError || locating || confirming}>
          <LocateFixed aria-hidden="true" /> {locating ? "Finding location…" : "Use current location"}
        </Button>
        <Button type="button" onClick={confirmPin} disabled={disabled || !draft || loading || !!mapError || locating || confirming}>
          {confirming ? "Finding address…" : "Confirm this pin"}
        </Button>
      </div>
      {draft && <p className="text-xs text-muted-foreground" role="status">Selected point: {draft.latitude.toFixed(5)}, {draft.longitude.toFixed(5)}{selected?.latitude === draft.latitude && selected?.longitude === draft.longitude ? " · Confirmed" : " · Confirm the pin to use it"}</p>}
      {locationError && <p role="alert" className="text-sm text-destructive">{locationError}</p>}
    </section>
  );
}
