"use client";
import type {
  FacilityMapPoint,
  MapInstance,
} from "../types/facilityLocationMap";
export function centerOf(map: MapInstance): FacilityMapPoint | null {
  const center = map.getCenter();
  return center ? { latitude: center.lat(), longitude: center.lng() } : null;
}
