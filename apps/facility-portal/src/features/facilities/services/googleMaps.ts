"use client";

import type { MapsNamespace, MapWindow } from "../types/facilityLocationMap";

export let mapsPromise: Promise<MapsNamespace> | null = null;

export function loadMaps(apiKey: string): Promise<MapsNamespace> {
  const browser = window as MapWindow;
  if (browser.google?.maps?.Map) return Promise.resolve(browser.google.maps);
  if (mapsPromise) return mapsPromise;

  mapsPromise = new Promise<MapsNamespace>((resolve, reject) => {
    const script = document.createElement("script");
    const fail = () => {
      delete browser.__clinzoFacilityMapReady;
      script.remove();
      mapsPromise = null;
      reject(
        new Error(
          "The map could not load. Check the Maps JavaScript API key and try again."
        )
      );
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
