export type FacilityMapPoint = { latitude: number; longitude: number };

export type SearchPlace = FacilityMapPoint & { address: string };

export type MapCenter = { lat: () => number; lng: () => number };

export type MapInstance = {
  getCenter: () => MapCenter | undefined;
  setCenter: (point: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  addListener: (
    event: string,
    callback: (event?: { latLng?: MapCenter }) => void
  ) => { remove: () => void };
};

export type MapsNamespace = {
  Map: new (
    element: HTMLElement,
    options: Record<string, unknown>
  ) => MapInstance;
};

export type MapWindow = Window & {
  google?: { maps?: MapsNamespace };
  __clinzoFacilityMapReady?: () => void;
};

export type FacilityLocationMapProps = {
  apiKey: string;
  selected: FacilityMapPoint | null;
  getCurrentLocation: () => Promise<FacilityMapPoint>;
  onConfirm: (point: FacilityMapPoint) => Promise<void>;
  onUnavailable: (unavailable: boolean) => void;
  disabled?: boolean;
};
